const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { OPENID } = cloud.getWXContext()

  const { job_id, job_title, is_edit = false } = event || {} // is_edit: true表示微调，false表示首次生成

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
    const userRef = db.collection('users').doc(OPENID)
    const userResult = await userRef.get()
    const user = userResult.data || {}

    // 先检查会员状态
    const now = new Date()
    const expireAt = user.member_expire_at ? new Date(user.member_expire_at) : null
    const isValidMember = user.member_level && user.member_level > 0 && expireAt && expireAt > now

    if (!isValidMember) {
      return {
        success: false,
        message: '您不是有效会员或会员已过期',
        needUpgrade: true,
      }
    }

    // 获取会员方案
    const schemeResult = await db.collection('member_schemes')
      .where({ scheme_id: user.member_level })
      .get()

    if (!schemeResult.data || schemeResult.data.length === 0) {
      return {
        success: false,
        message: '会员方案不存在',
      }
    }

    const scheme = schemeResult.data[0]

    // 检查岗位使用记录
    const usageResult = await db.collection('user_job_usage')
      .where({
        user_id: OPENID,
        job_id: job_id,
      })
      .get()

    let jobUsage = usageResult.data && usageResult.data.length > 0 ? usageResult.data[0] : null

    // 如果是首次生成（不是微调）
    if (!is_edit) {
      // 检查岗位数限制（3天和普通会员）
      if (scheme.max_jobs > 0) {
        const usedJobsCount = user.used_jobs_count || 0
        if (usedJobsCount >= scheme.max_jobs) {
          return {
            success: false,
            message: `已达到最大岗位数限制（${scheme.max_jobs}个）`,
            needUpgrade: true,
          }
        }

        // 如果该岗位还没有使用记录，需要创建新记录并增加已使用岗位数
        if (!jobUsage) {
          // 创建岗位使用记录
          await db.collection('user_job_usage').add({
            data: {
              user_id: OPENID,
              job_id: job_id,
              job_title: job_title || '',
              resume_edits_count: 0,
              email_sends_count: 0,
              email_communications_count: 0,
              createdAt: db.serverDate(),
              updatedAt: db.serverDate(),
            },
          })

          // 增加已使用岗位数
          await userRef.update({
            data: {
              used_jobs_count: usedJobsCount + 1,
              updatedAt: db.serverDate(),
            },
          })

          return {
            success: true,
            message: '简历生成成功',
            isNewJob: true,
          }
        }
      } else {
        // 高级会员：检查总配额
        const totalResumeQuota = user.total_resume_quota || 0
        if (totalResumeQuota <= 0) {
          return {
            success: false,
            message: '简历生成配额不足',
            needUpgrade: true,
          }
        }

        // 扣除总配额
        await userRef.update({
          data: {
            total_resume_quota: totalResumeQuota - 1,
            updatedAt: db.serverDate(),
          },
        })

        // 如果该岗位还没有使用记录，创建新记录
        if (!jobUsage) {
          await db.collection('user_job_usage').add({
            data: {
              user_id: OPENID,
              job_id: job_id,
              job_title: job_title || '',
              resume_edits_count: 0,
              email_sends_count: 0,
              email_communications_count: 0,
              createdAt: db.serverDate(),
              updatedAt: db.serverDate(),
            },
          })
        }

        return {
          success: true,
          message: '简历生成成功',
          remainingQuota: totalResumeQuota - 1,
        }
      }
    } else {
      // 微调操作
      if (!jobUsage) {
        return {
          success: false,
          message: '请先生成简历',
        }
      }

      // 检查微调次数限制
      if (scheme.max_resume_edits_per_job > 0) {
        const editsCount = jobUsage.resume_edits_count || 0
        if (editsCount >= scheme.max_resume_edits_per_job) {
          return {
            success: false,
            message: `该岗位已达到最大微调次数（${scheme.max_resume_edits_per_job}次）`,
            needUpgrade: true,
          }
        }

        // 增加微调次数
        await db.collection('user_job_usage').doc(jobUsage._id).update({
          data: {
            resume_edits_count: editsCount + 1,
            last_resume_edit_at: db.serverDate(),
            updatedAt: db.serverDate(),
          },
        })

        return {
          success: true,
          message: '简历微调成功',
          remainingEdits: scheme.max_resume_edits_per_job - (editsCount + 1),
        }
      } else {
        // 高级会员：不限制微调次数，但需要检查总配额
        const totalResumeQuota = user.total_resume_quota || 0
        if (totalResumeQuota <= 0) {
          return {
            success: false,
            message: '简历生成配额不足',
            needUpgrade: true,
          }
        }

        // 扣除总配额并更新微调次数
        await Promise.all([
          userRef.update({
            data: {
              total_resume_quota: totalResumeQuota - 1,
              updatedAt: db.serverDate(),
            },
          }),
          db.collection('user_job_usage').doc(jobUsage._id).update({
            data: {
              resume_edits_count: (jobUsage.resume_edits_count || 0) + 1,
              last_resume_edit_at: db.serverDate(),
              updatedAt: db.serverDate(),
            },
          }),
        ])

        return {
          success: true,
          message: '简历微调成功',
          remainingQuota: totalResumeQuota - 1,
        }
      }
    }
  } catch (err) {
    console.error('使用简历配额失败:', err)
    return {
      success: false,
      message: '使用简历配额失败',
      error: err.message,
    }
  }
}

