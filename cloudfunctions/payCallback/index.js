const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 微信支付回调云函数
 */
exports.main = async (event, context) => {
  const {
    outTradeNo, // 订单号
    resultCode, // 业务结果
    returnCode, // 返回状态码
  } = event

  console.log('Payment Callback received:', event)

  if (returnCode === 'SUCCESS' && resultCode === 'SUCCESS') {
    const db = cloud.database()
    
    try {
      // 1. 查找订单
      const orderResult = await db.collection('orders')
        .where({ order_id: outTradeNo })
        .get()

      if (orderResult.data && orderResult.data.length > 0) {
        const order = orderResult.data[0]

        // 2. 如果订单状态不是已支付，则更新
        if (order.status !== '已支付') {
          await db.collection('orders').doc(order._id).update({
            data: {
              status: '已支付',
              pay_time: db.serverDate(),
              updatedAt: db.serverDate(),
            }
          })

          console.log(`Order ${outTradeNo} marked as paid.`)
        }

        // 3. 检查是否已激活
        if (!order.is_activated) {
          await activateUserMembership(order.user_id, order.scheme_id, order._id)
        }
      }
    } catch (err) {
      console.error('Error processing payment callback:', err)
      return { errCode: 1, errMsg: err.message }
    }
  }

  return { errCode: 0, errMsg: 'SUCCESS' }
}

/**
 * 激活用户会员权益
 */
async function activateUserMembership(openid, schemeId, orderDocId) {
  const db = cloud.database()
  
  // 1. 再次确认订单状态，防止并发导致的重复激活
  const orderCheck = await db.collection('orders').doc(orderDocId).get()
  if (orderCheck.data && orderCheck.data.is_activated) {
    return
  }
  
  // 获取会员方案
  const schemeResult = await db.collection('member_schemes')
    .where({ scheme_id: schemeId })
    .get()

  if (!schemeResult.data || schemeResult.data.length === 0) {
    console.error(`Scheme ${schemeId} not found`)
    return
  }

  const scheme = schemeResult.data[0]
  const now = new Date()
  const durationMs = scheme.duration_days * 24 * 60 * 60 * 1000
  
  const userRef = db.collection('users').doc(openid)
  const userResult = await userRef.get()
  
  if (!userResult.data) {
    console.error(`User ${openid} not found`)
    return
  }
  
  const user = userResult.data
  const membership = user.membership || {
    level: 0,
    expire_at: null,
    total_ai_usage: { used: 0, limit: 300 },
    job_quota: { used: 0, limit: 0 },
    job_details: {}
  }

  // 计算到期时间
  let finalExpireAt = new Date(now.getTime() + durationMs)
  if (membership.expire_at) {
    const currentExpireAt = new Date(membership.expire_at)
    if (currentExpireAt > now) {
      // 如果还在有效期内，则在原有基础上累加
      finalExpireAt = new Date(currentExpireAt.getTime() + durationMs)
    }
  }

  // 更新会员信息
  membership.level = scheme.scheme_id
  membership.expire_at = finalExpireAt
  
  // 设置对应的配额（与 activateMembership 逻辑保持一致）
  if (membership.level === 1) membership.job_quota.limit = 3
  else if (membership.level === 2) membership.job_quota.limit = 10
  else if (membership.level === 3) membership.job_quota.limit = 300

  // 同步更新 pts_quota (兼容前端 Points 系统)
  membership.pts_quota = {
    used: membership.job_quota.used || 0,
    limit: membership.job_quota.limit
  }

  await userRef.update({
    data: {
      membership,
      updatedAt: db.serverDate()
    }
  })

  // 标记订单为已激活
  await db.collection('orders').doc(orderDocId).update({
    data: {
      is_activated: true,
      updatedAt: db.serverDate()
    }
  })
  
  console.log(`Membership activated for user ${openid}, level ${membership.level}, expires at ${finalExpireAt}`)
}

