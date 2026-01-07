const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { OPENID } = cloud.getWXContext()

  const { job_id, job_title, job_data } = event || {}

  if (!OPENID) {
    return {
      success: false,
      message: '无法获取用户身份',
    }
  }

  if (!job_id) {
    return {
      success: false,
      message: '岗位ID不能为空',
    }
  }

  try {
    // 检查是否已经投递过
    const existingResult = await db.collection('applied_jobs')
      .where({
        user_id: OPENID,
        job_id: job_id,
      })
      .get()

    if (existingResult.data && existingResult.data.length > 0) {
      return {
        success: false,
        alreadyApplied: true,
        message: '您已经投递过该岗位，请耐心等待，可以在"我"的页面查看',
      }
    }

    // 调用 useEmailQuota 扣除投递次数
    const quotaResult = await cloud.callFunction({
      name: 'useEmailQuota',
      data: {
        job_id: job_id,
        email_type: 'send',
      },
    })

    if (!quotaResult.result?.success) {
      return {
        success: false,
        alreadyApplied: false,
        needUpgrade: quotaResult.result?.needUpgrade || false,
        message: quotaResult.result?.message || '投递失败，配额不足',
      }
    }

    // 创建投递记录
    const now = db.serverDate()
    const appliedJobData = {
      user_id: OPENID,
      job_id: job_id,
      job_title: job_title || '',
      job_data: job_data || {}, // 保存岗位的完整数据，方便后续查看
      status: 'pending', // pending: 待处理, processing: 处理中, completed: 已完成
      applied_at: now,
      createdAt: now,
      updatedAt: now,
    }

    const result = await db.collection('applied_jobs').add({
      data: appliedJobData,
    })

    return {
      success: true,
      message: '投递成功',
      appliedJob: {
        ...appliedJobData,
        _id: result._id,
      },
    }
  } catch (err) {
    console.error('投递简历失败:', err)
    return {
      success: false,
      message: '投递失败',
      error: err.message,
    }
  }
}

