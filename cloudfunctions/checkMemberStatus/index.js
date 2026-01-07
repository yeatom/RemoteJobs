const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    return {
      success: false,
      message: '无法获取用户身份',
    }
  }

  try {
    const userRef = db.collection('users').doc(OPENID)
    const userResult = await userRef.get()
    const user = userResult.data || {}

    const now = new Date()
    const expireAt = user.member_expire_at ? new Date(user.member_expire_at) : null

    // 检查会员是否过期
    let isExpired = true
    let isValidMember = false

    if (user.member_level && user.member_level > 0 && expireAt && expireAt > now) {
      isExpired = false
      isValidMember = true
    }

    // 检查邮件配额是否需要重置（高级会员每月重置）
    let total_email_quota = user.total_email_quota || -1
    let email_quota_reset_at = user.email_quota_reset_at ? new Date(user.email_quota_reset_at) : null
    
    if (user.member_level === 3 && email_quota_reset_at && email_quota_reset_at <= now) {
      // 需要重置邮件配额
      const schemeResult = await db.collection('member_schemes')
        .where({ scheme_id: 3 })
        .get()
      
      if (schemeResult.data && schemeResult.data.length > 0) {
        const scheme = schemeResult.data[0]
        total_email_quota = scheme.total_email_limit || 300
        
        // 计算下个月1号的重置时间
        const resetDate = new Date(now)
        resetDate.setMonth(resetDate.getMonth() + 1)
        resetDate.setDate(1)
        resetDate.setHours(0, 0, 0, 0)
        email_quota_reset_at = resetDate
        
        await userRef.update({
          data: {
            total_email_quota,
            email_quota_reset_at,
            updatedAt: db.serverDate(),
          },
        })
      }
    }

    // 如果过期，重置为普通用户
    if (isExpired && user.member_level && user.member_level > 0) {
      await userRef.update({
        data: {
          member_level: 0,
          member_expire_at: null,
          total_resume_quota: -1,
          total_email_quota: -1,
          email_quota_reset_at: null,
          used_jobs_count: 0,
          updatedAt: db.serverDate(),
        },
      })

      return {
        success: true,
        member_level: 0,
        isExpired: true,
        isValidMember: false,
        total_resume_quota: -1,
        total_email_quota: -1,
        used_jobs_count: 0,
        member_expire_at: null,
      }
    }

    return {
      success: true,
      member_level: user.member_level || 0,
      isExpired: isExpired,
      isValidMember: isValidMember,
      total_resume_quota: user.total_resume_quota !== undefined ? user.total_resume_quota : -1,
      total_email_quota: total_email_quota,
      used_jobs_count: user.used_jobs_count || 0,
      member_expire_at: user.member_expire_at || null,
    }
  } catch (err) {
    console.error('检查会员状态失败:', err)
    return {
      success: false,
      message: '检查会员状态失败',
      error: err.message,
    }
  }
}

