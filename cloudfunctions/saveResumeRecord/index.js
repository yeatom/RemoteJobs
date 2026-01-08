const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 保存 AI 生成简历的元数据到数据库
 * event: { fileId, jobId, jobTitle, company, resumeInfo }
 */
exports.main = async (event, context) => {
  const db = cloud.database()
  const { OPENID } = cloud.getWXContext()
  const { fileId, jobId, jobTitle, company, resumeInfo } = event

  if (!OPENID) {
    return { success: false, message: '未获取到用户身份' }
  }

  if (!fileId) {
    return { success: false, message: 'fileId 不能为空' }
  }

  try {
    const recordData = {
      _openid: OPENID,
      fileId,
      jobId: jobId || '',
      jobTitle: jobTitle || '自定义简历',
      company: company || '',
      resumeInfo: resumeInfo || {},
      createTime: db.serverDate(),
      isApplied: false
    }

    const res = await db.collection('generated_resumes').add({
      data: recordData
    })

    return {
      success: true,
      message: '记录保存成功',
      id: res._id
    }
  } catch (err) {
    console.error('保存简历记录失败:', err)
    return {
      success: false,
      message: '数据库保存失败',
      error: err.message
    }
  }
}

