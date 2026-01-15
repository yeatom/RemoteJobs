const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 统一配额扣减逻辑 (简历生成/微调)
 * event: {
 *   job_id: string,
 *   job_title: string,
 *   is_edit: boolean // true: 微调, false: 首次生成
 * }
 */
exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const { OPENID } = cloud.getWXContext()
  const { job_id, job_title, is_edit = false } = event || {}

  if (!OPENID || !job_id) {
    return { success: false, message: '参数无效' }
  }

  try {
    const userRef = db.collection('users').doc(OPENID)
    const userRes = await userRef.get()
    const user = userRes.data

    if (!user) return { success: false, message: '用户不存在' }

    const now = new Date()
    const membership = user.membership || { level: 0 }
    const level = membership.level || 0
    const expireAt = membership.expire_at ? new Date(membership.expire_at) : null
    const isValidMember = level > 0 && expireAt && expireAt > now

    if (!isValidMember) {
      return { success: false, message: '会员已过期或未激活', needUpgrade: true }
    }

    // 1. 全局审计（所有会员共用 300 次硬上限，防止滥用）
    if (membership.total_ai_usage && membership.total_ai_usage.used >= (membership.total_ai_usage.limit || 300)) {
      return { success: false, message: '总 AI 配额已耗尽' }
    }

    // 2. 差异化权益判断
    if (level === 1 || level === 2) {
      const limits = level === 1 
        ? { jobs: 3, tweak: 3 } 
        : { jobs: 10, tweak: 5 };

      const jobDetails = membership.job_details || {}
      const currentJob = jobDetails[job_id]

    if (!is_edit) {
        // 首次生成：检查岗位槽位
        if (!currentJob && membership.pts_quota.used >= limits.jobs) {
          return { success: false, message: `岗位数量已达上限 (${limits.jobs}个)`, needUpgrade: true }
        }
      } else {
        // 微调：检查该岗位微调次数
        if (!currentJob) return { success: false, message: '请先生成该岗位的初始简历' }
        if (currentJob.tweak_count >= limits.tweak) {
          return { success: false, message: `该岗位微调次数已达上限 (${limits.tweak}次)`, needUpgrade: true }
        }
          }
        }

    // 3. 执行扣减与更新
    const updateData = {
      'membership.total_ai_usage.used': _.inc(1),
      'updatedAt': db.serverDate()
    }

    if (level === 1 || level === 2) {
      const jobPath = `membership.job_details.${job_id}`
      if (!is_edit) {
        // 首次生成：如果该岗位是第一次出现在 job_details 中，增加 pts_quota.used
        if (!membership.job_details || !membership.job_details[job_id]) {
          updateData['membership.pts_quota.used'] = _.inc(1)
          updateData[jobPath] = {
            tweak_count: 0,
            email_count: 0,
            applied: false,
              job_title: job_title || '',
            createdAt: db.serverDate()
          }
        }
      } else {
        // 微调
        updateData[`${jobPath}.tweak_count`] = _.inc(1)
      }
    } else if (level === 3) {
       // 高级会员不记录详细槽位限制，但为了展示方便，还是可以记录一下
       const jobPath = `membership.job_details.${job_id}`
       if (!membership.job_details || !membership.job_details[job_id]) {
         updateData['membership.pts_quota.used'] = _.inc(1)
         updateData[jobPath] = {
           tweak_count: is_edit ? 1 : 0,
           email_count: 0,
           applied: false,
           job_title: job_title || '',
           createdAt: db.serverDate()
         }
       } else if (is_edit) {
         updateData[`${jobPath}.tweak_count`] = _.inc(1)
       }
    }

    await userRef.update({ data: updateData })
    
    // 同步更新 user_job_usage 集合以保持兼容性
    try {
      const usageCol = db.collection('user_job_usage')
      const usageRes = await usageCol.where({ user_id: OPENID, job_id }).get()
      if (usageRes.data.length > 0) {
        await usageCol.doc(usageRes.data[0]._id).update({
          data: {
            resume_edits_count: _.inc(is_edit ? 1 : 0),
            updatedAt: db.serverDate()
          }
        })
      } else {
        await usageCol.add({
            data: {
              user_id: OPENID,
            job_id,
              job_title: job_title || '',
            resume_edits_count: is_edit ? 1 : 0,
              email_sends_count: 0,
              email_communications_count: 0,
              createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
          })
        }
    } catch (e) { console.error('Sync to user_job_usage failed', e) }

    return { success: true, message: is_edit ? '微调成功' : '生成成功' }
  } catch (err) {
    console.error(err)
    return { success: false, message: '系统错误', error: err.message }
  }
}
