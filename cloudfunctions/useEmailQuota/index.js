const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { OPENID } = cloud.getWXContext()

  const { job_id, email_type = 'send' } = event || {} // email_type: 'send' | 'communication'

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

  if (email_type !== 'send' && email_type !== 'communication') {
    return {
      success: false,
      message: '邮件类型无效，必须是 send 或 communication',
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

    // 如果是投递邮件
    if (email_type === 'send') {
      // 检查投递次数限制
      if (scheme.max_email_sends_per_job > 0) {
        if (!jobUsage) {
          // 创建岗位使用记录
          await db.collection('user_job_usage').add({
            data: {
              user_id: OPENID,
              job_id: job_id,
              job_title: '',
              resume_edits_count: 0,
              email_sends_count: 1,
              email_communications_count: 0,
              last_email_at: db.serverDate(),
              createdAt: db.serverDate(),
              updatedAt: db.serverDate(),
            },
          })

          return {
            success: true,
            message: '邮件投递成功',
          }
        }

        const sendsCount = jobUsage.email_sends_count || 0
        if (sendsCount >= scheme.max_email_sends_per_job) {
          return {
            success: false,
            message: `该岗位已达到最大投递次数（${scheme.max_email_sends_per_job}次）`,
            needUpgrade: true,
          }
        }

        // 增加投递次数
        await db.collection('user_job_usage').doc(jobUsage._id).update({
          data: {
            email_sends_count: sendsCount + 1,
            last_email_at: db.serverDate(),
            updatedAt: db.serverDate(),
          },
        })

        return {
          success: true,
          message: '邮件投递成功',
          remainingSends: scheme.max_email_sends_per_job - (sendsCount + 1),
        }
      } else {
        // 高级会员：检查总配额
        const totalEmailQuota = user.total_email_quota || 0
        if (totalEmailQuota <= 0) {
          return {
            success: false,
            message: '邮件配额不足',
            needUpgrade: true,
          }
        }

        // 扣除总配额
        await userRef.update({
          data: {
            total_email_quota: totalEmailQuota - 1,
            updatedAt: db.serverDate(),
          },
        })

        // 如果该岗位还没有使用记录，创建新记录
        if (!jobUsage) {
          await db.collection('user_job_usage').add({
            data: {
              user_id: OPENID,
              job_id: job_id,
              job_title: '',
              resume_edits_count: 0,
              email_sends_count: 1,
              email_communications_count: 0,
              last_email_at: db.serverDate(),
              createdAt: db.serverDate(),
              updatedAt: db.serverDate(),
            },
          })
        } else {
          await db.collection('user_job_usage').doc(jobUsage._id).update({
            data: {
              email_sends_count: (jobUsage.email_sends_count || 0) + 1,
              last_email_at: db.serverDate(),
              updatedAt: db.serverDate(),
            },
          })
        }

        return {
          success: true,
          message: '邮件投递成功',
          remainingQuota: totalEmailQuota - 1,
        }
      }
    } else {
      // 沟通邮件
      if (!jobUsage) {
        return {
          success: false,
          message: '请先投递邮件',
        }
      }

      // 检查沟通次数限制
      if (scheme.max_email_communications_per_job > 0) {
        const commCount = jobUsage.email_communications_count || 0
        if (commCount >= scheme.max_email_communications_per_job) {
          return {
            success: false,
            message: `该岗位已达到最大沟通次数（${scheme.max_email_communications_per_job}次）`,
            needUpgrade: true,
          }
        }

        // 增加沟通次数
        await db.collection('user_job_usage').doc(jobUsage._id).update({
          data: {
            email_communications_count: commCount + 1,
            last_email_at: db.serverDate(),
            updatedAt: db.serverDate(),
          },
        })

        return {
          success: true,
          message: '邮件发送成功',
          remainingCommunications: scheme.max_email_communications_per_job - (commCount + 1),
        }
      } else if (scheme.max_email_communications_per_job === -1) {
        // 高级会员：不限制沟通次数，但需要检查总配额
        const totalEmailQuota = user.total_email_quota || 0
        if (totalEmailQuota <= 0) {
          return {
            success: false,
            message: '邮件配额不足',
            needUpgrade: true,
          }
        }

        // 扣除总配额并更新沟通次数
        await Promise.all([
          userRef.update({
            data: {
              total_email_quota: totalEmailQuota - 1,
              updatedAt: db.serverDate(),
            },
          }),
          db.collection('user_job_usage').doc(jobUsage._id).update({
            data: {
              email_communications_count: (jobUsage.email_communications_count || 0) + 1,
              last_email_at: db.serverDate(),
              updatedAt: db.serverDate(),
            },
          }),
        ])

        return {
          success: true,
          message: '邮件发送成功',
          remainingQuota: totalEmailQuota - 1,
        }
      } else {
        // max_email_communications_per_job === 0，无沟通权
        return {
          success: false,
          message: '您的会员方案不支持后续沟通',
          needUpgrade: true,
        }
      }
    }
  } catch (err) {
    console.error('使用邮件配额失败:', err)
    return {
      success: false,
      message: '使用邮件配额失败',
      error: err.message,
    }
  }
}

