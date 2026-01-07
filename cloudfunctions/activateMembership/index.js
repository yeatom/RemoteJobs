const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { OPENID } = cloud.getWXContext()

  const { order_id } = event || {}

  if (!OPENID) {
    return {
      success: false,
      message: '无法获取用户身份',
    }
  }

  if (!order_id) {
    return {
      success: false,
      message: '订单号不能为空',
    }
  }

  try {
    // 查找订单
    const orderResult = await db.collection('orders')
      .where({
        order_id: order_id,
        user_id: OPENID,
        status: '已支付',
      })
      .get()

    if (!orderResult.data || orderResult.data.length === 0) {
      return {
        success: false,
        message: '订单不存在或未支付',
      }
    }

    const order = orderResult.data[0]

    // 获取会员方案
    const schemeResult = await db.collection('member_schemes')
      .where({ scheme_id: order.scheme_id })
      .get()

    if (!schemeResult.data || schemeResult.data.length === 0) {
      return {
        success: false,
        message: '会员方案不存在',
      }
    }

    const scheme = schemeResult.data[0]

    // 计算会员到期时间
    const now = new Date()
    const expireAt = new Date(now.getTime() + scheme.duration_days * 24 * 60 * 60 * 1000)

    // 获取用户当前信息
    const userRef = db.collection('users').doc(OPENID)
    const userResult = await userRef.get()
    const user = userResult.data || {}

    // 确定会员等级
    // 0:普通用户, 1:3天会员, 2:普通月卡, 3:高级月卡
    let member_level = 0
    if (scheme.scheme_id === 1) {
      member_level = 1
    } else if (scheme.scheme_id === 2) {
      member_level = 2
    } else if (scheme.scheme_id === 3) {
      member_level = 3
    }

    // 如果用户已有会员且未过期，在现有到期时间基础上延长
    // 如果已过期或没有会员，从当前时间开始计算
    let finalExpireAt = expireAt
    if (user.member_expire_at) {
      const currentExpireAt = new Date(user.member_expire_at)
      if (currentExpireAt > now) {
        // 未过期，延长
        finalExpireAt = new Date(currentExpireAt.getTime() + scheme.duration_days * 24 * 60 * 60 * 1000)
      }
    }

    // 更新用户会员信息
    // 根据新方案结构初始化配额
    let total_resume_quota = -1  // 默认-1（按岗位数限制）
    let total_email_quota = -1   // 默认-1（按岗位数限制）
    let used_jobs_count = 0      // 已使用的岗位数
    let email_quota_reset_at = null

    // 如果是高级会员（scheme_id === 3），使用总额度限制
    if (scheme.scheme_id === 3) {
      total_resume_quota = scheme.total_resume_limit || 300
      total_email_quota = scheme.total_email_limit || 300
      
      // 计算邮件配额重置时间（下个月1号）
      const resetDate = new Date(now)
      resetDate.setMonth(resetDate.getMonth() + 1)
      resetDate.setDate(1)
      resetDate.setHours(0, 0, 0, 0)
      email_quota_reset_at = resetDate
    }

    // 如果是同等级会员续费
    if (user.member_level === member_level && user.member_expire_at) {
      const currentExpireAt = new Date(user.member_expire_at)
      if (currentExpireAt > now) {
        // 同等级续费，保留已使用的岗位数，但重置配额
        used_jobs_count = user.used_jobs_count || 0
        
        // 高级会员续费，配额累加
        if (scheme.scheme_id === 3) {
          total_resume_quota = (user.total_resume_quota || 0) + (scheme.total_resume_limit || 300)
          total_email_quota = (user.total_email_quota || 0) + (scheme.total_email_limit || 300)
        }
      }
    }

    await userRef.update({
      data: {
        member_level,
        member_expire_at: finalExpireAt,
        total_resume_quota,
        total_email_quota,
        email_quota_reset_at,
        used_jobs_count,
        updatedAt: db.serverDate(),
      },
    })

    const updatedUser = await userRef.get()

    return {
      success: true,
      message: '会员激活成功',
      user: updatedUser.data,
    }
  } catch (err) {
    console.error('激活会员失败:', err)
    return {
      success: false,
      message: '激活会员失败',
      error: err.message,
    }
  }
}

