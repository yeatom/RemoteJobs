const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { OPENID } = cloud.getWXContext()

  const userRef = db.collection('users').doc(OPENID)

  try {
    const existing = await userRef.get()
    const user = existing?.data || {}

    if (user.openid) {
    return { openid: OPENID, user }
    }
  } catch (err) {
    let inviteCode = null
    try {
      const generateResult = await cloud.callFunction({
        name: 'generateInviteCode'
      })
      if (generateResult.result?.success) {
        inviteCode = generateResult.result.inviteCode
      }
    } catch (inviteErr) {
      // ignore
    }

    const now = db.serverDate()
    
    // 生成随机昵称：用户 + 6位随机数字/小写字母
    const randomStr = Math.random().toString(36).substring(2, 8)
    const defaultNickname = `用户${randomStr}`
    
    // 动态获取当前环境 ID，拼接默认头像地址
    const { ENV } = cloud.getWXContext()
    const defaultAvatar = `cloud://${ENV}.636c-${ENV}-1392489857/avatars/default-avatar.png`

    const userData = {
        openid: OPENID,
        isAuthed: false,
        phone: null,
        nickname: defaultNickname,
        avatar: defaultAvatar,
        language: 'Chinese',
        
        // --- 核心改动：会员权益与配额包裹字段 ---
        membership: {
          level: 0, // 0:普通用户, 1:3天会员, 2:普通月卡, 3:高级月卡
          expire_at: null,
          total_ai_usage: {
            used: 0,
            limit: 300 // 内部硬上限，对高级会员生效
          },
          job_quota: {
            used: 0,
            limit: 0
          },
          job_details: {} // 记录每个岗位的微调/沟通次数
        },

        // --- 核心改动：简历资料包裹字段 ---
        resume_profile: {
          name: '',
          photo: '',
          wechat: '',
          email: '',
          phone: '',
          educations: [],
          workExperiences: [],
          certificates: [],
          aiMessage: '当工作经验不足时，自动补充工作经历；当过往职位名称与目标岗位不匹配时，根据公司业务方向，灵活变更过往职位名称与工作内容。'
        },
        resume_completeness: 0,

        createdAt: now,
        updatedAt: now,
    }

    if (inviteCode) {
      userData.inviteCode = inviteCode
    }

    await userRef.set({
      data: userData,
    })

    const created = await userRef.get()
    return { openid: OPENID, user: created.data }
  }
}
