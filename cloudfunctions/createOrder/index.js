const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { OPENID } = cloud.getWXContext()

  const { scheme_id, amount } = event || {}

  if (!OPENID) {
    return {
      success: false,
      message: '无法获取用户身份',
    }
  }

  if (!scheme_id) {
    return {
      success: false,
      message: '请选择会员方案',
    }
  }

  try {
    // 验证方案是否存在
    const schemeResult = await db.collection('member_schemes')
      .where({ scheme_id: scheme_id })
      .get()

    if (!schemeResult.data || schemeResult.data.length === 0) {
      return {
        success: false,
        message: '会员方案不存在',
      }
    }

    const scheme = schemeResult.data[0]
    const actualAmount = amount || scheme.price

    // 生成唯一订单号：时间戳 + 随机数，并检查唯一性
    let order_id = null
    let attempts = 0
    const maxAttempts = 10

    while (!order_id && attempts < maxAttempts) {
      attempts++
      const candidate_id = `ORDER${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
      
      // 检查订单号是否已存在
      const existingOrder = await db.collection('orders')
        .where({ order_id: candidate_id })
        .get()
      
      if (!existingOrder.data || existingOrder.data.length === 0) {
        order_id = candidate_id
      }
      
      // 如果重复，等待1毫秒后重试（避免时间戳相同）
      if (!order_id && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    }

    if (!order_id) {
      return {
        success: false,
        message: '生成唯一订单号失败，请重试',
      }
    }

    const now = db.serverDate()
    const orderData = {
      order_id,
      user_id: OPENID,
      scheme_id: scheme_id,
      amount: actualAmount,
      status: '待支付', // 待支付、已支付、已退款、已关闭
      pay_time: null,
      createdAt: now,
      updatedAt: now,
    }

    const result = await db.collection('orders').add({
      data: orderData,
    })

    // --- 核心改动：接入云支付统一下单 ---
    // 注意：需先在云开发控制台配置商户号，并在此填入正确的 subMchId
    const res = await cloud.cloudPay.unifiedOrder({
      "body": `会员续费-${scheme.name}`,
      "outTradeNo": order_id,
      "spbillCreateIp": "127.0.0.1", // 云函数环境下可用 127.0.0.1
      "subMchId": event.mchId, // 从前端 env.js 中获取，不在代码中硬编码
      "totalFee": Math.round(actualAmount * 100), // 单位为分
      "envId": event.envId, // 从前端 env.js 中获取的环境 ID
      "functionName": "payCallback" // 支付回调云函数名
    })

    if (res.returnCode === 'SUCCESS' && res.resultCode === 'SUCCESS') {
      if (!res.payment) {
        return {
          success: false,
          message: '统一下单成功但未返回支付参数，请检查云开发微信支付配置',
          error: res
        }
      }
      return {
        success: true,
        order_id,
        payment: res.payment, // 返回给前端 wx.requestPayment 使用的参数
        order: {
          ...orderData,
          _id: result._id,
        },
        scheme: scheme,
      }
    } else {
      // 这里的 res.returnMsg 在通信成功时通常是 "OK"，
      // 真正的业务错误信息通常在 res.errCodeDes 中
      const errorMsg = res.errCodeDes || res.returnMsg || '统一下单失败'
      return {
        success: false,
        message: errorMsg,
        error: res
      }
    }
  } catch (err) {
    console.error('创建订单失败:', err)
    return {
      success: false,
      message: '创建订单失败',
      error: err.message,
    }
  }
}

