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
    const membership = user.membership || {
      level: 0,
      expire_at: null,
      total_ai_usage: { used: 0, limit: 300 },
      pts_quota: { used: 0, limit: 0 },
      job_details: {}
    }

    const expireAt = membership.expire_at ? new Date(membership.expire_at) : null

    // 检查会员是否过期
    let isExpired = true
    let isValidMember = false

    if (membership.level > 0 && expireAt && expireAt > now) {
      isExpired = false
      isValidMember = true
    }

    // 如果过期，重置为普通用户
    if (isExpired && membership.level > 0) {
      membership.level = 0
      membership.expire_at = null
      if (membership.pts_quota) membership.pts_quota.limit = 0
      
      const resetData = {
        membership: membership,
            updatedAt: db.serverDate(),
      }

      await userRef.update({ data: resetData })

      return {
        success: true,
        membership,
        isExpired: true,
        isValidMember: false,
      }
    }

    return {
      success: true,
      membership,
      isExpired: isExpired,
      isValidMember: isValidMember,
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

