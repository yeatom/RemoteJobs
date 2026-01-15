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

    // 检查订单是否已激活过，防止重复激活导致有效期异常累加
    if (order.is_activated) {
      return {
        success: true,
        message: '会员已激活',
      }
    }

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
    let level = 0
    if (scheme.scheme_id === 1) {
      level = 1
    } else if (scheme.scheme_id === 2) {
      level = 2
    } else if (scheme.scheme_id === 3) {
      level = 3
    }

    // --- 核心改动：更新新版 membership 结构 ---
    const newMembership = user.membership || {
      level: 0,
      expire_at: null,
      total_ai_usage: { used: 0, limit: 300 },
      pts_quota: { used: 0, limit: 0 },
      job_details: {}
    }

    // 如果用户已有会员且未过期，在现有到期时间基础上延长
    let finalExpireAt = expireAt
    if (newMembership.expire_at) {
      const currentExpireAt = new Date(newMembership.expire_at)
      if (currentExpireAt > now) {
        finalExpireAt = new Date(currentExpireAt.getTime() + scheme.duration_days * 24 * 60 * 60 * 1000)
      }
    }

    // 确定会员等级并同步
    newMembership.level = level
    newMembership.expire_at = finalExpireAt
    
    // 初始化 pts_quota 如果不存在
    if (!newMembership.pts_quota) {
      newMembership.pts_quota = { used: 0, limit: 0 }
    }

    // 根据等级设置 Points 上限
    if (level === 1) newMembership.pts_quota.limit = 3
    else if (level === 2) newMembership.pts_quota.limit = 10
    else if (level === 3) newMembership.pts_quota.limit = 300

    // 移除旧字段
    delete newMembership.job_quota
    delete newMembership.resume_quota

    // 如果是同等级续费，高级会员配额可根据需要在此累加 total_ai_usage.limit（目前默认为300）

    await userRef.update({
      data: {
        membership: newMembership,
        updatedAt: db.serverDate(),
      },
    })

    // 标记订单为已激活
    await db.collection('orders').doc(order._id).update({
      data: {
        is_activated: true,
        updatedAt: db.serverDate(),
      }
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

