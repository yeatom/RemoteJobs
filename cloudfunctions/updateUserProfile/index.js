// cloudfunctions/updateUserProfile/index.js
// 更新用户授权信息（头像昵称 / 手机号等）

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { OPENID } = cloud.getWXContext()

  const { nickname, avatar, phone, isAuthed, resume_profile } = event || {}

  const updates = {}
  if (typeof nickname === 'string') updates.nickname = nickname
  if (typeof avatar === 'string') updates.avatar = avatar
  if (typeof phone === 'string') updates.phone = phone
  if (typeof isAuthed === 'boolean') updates.isAuthed = isAuthed
  
  // 处理 resume_profile 更新
  const userDoc = await db.collection('users').doc(OPENID).get().catch(() => ({ data: {} }))
  const currentUser = userDoc.data || {}
  const currentProfile = currentUser.resume_profile || { zh: {}, en: {} }

  if (resume_profile && typeof resume_profile === 'object') {
    // 允许部分更新或整体更新
    for (const key in resume_profile) {
      const val = resume_profile[key]
      updates[`resume_profile.${key}`] = val
      
      // 更新内存中的对象，用于后续计算
      const keys = key.split('.')
      let temp = currentProfile
      for (let i = 0; i < keys.length - 1; i++) {
        if (!temp[keys[i]]) temp[keys[i]] = {}
        temp = temp[keys[i]]
      }
      temp[keys[keys.length - 1]] = val
    }

    // 在云端重新计算完整度
    const calc = (profile, lang) => {
      let score = 0;
      if (profile.name) score += 10;
      if (profile.photo) score += 5;
      if (profile.gender) score += 5;
      if (profile.birthday) score += 5;

      if (lang === 'zh') {
        if (profile.wechat || profile.phone || profile.email) score += 15;
      } else {
        if (profile.email) score += 10;
        if (profile.location) score += 5;
      }

      if ((profile.educations || []).length > 0) score += 20;
      if ((profile.workExperiences || []).length > 0) score += 20;
      if ((profile.skills || []).length > 0) score += 10;
      if ((profile.certificates || []).length > 0) score += 5;
      if (profile.aiMessage) score += 5;

      const hasBasic = !!profile.name && 
                       (lang === 'zh' ? (profile.wechat || profile.phone || profile.email) : profile.email) &&
                       (profile.educations || []).length > 0 &&
                       (profile.workExperiences || []).length > 0;
      
      let level = 0;
      if (hasBasic) level = (score === 100) ? 2 : 1;
      return { score, level };
    }

    const resZh = calc(currentProfile.zh || {}, 'zh');
    const resEn = calc(currentProfile.en || {}, 'en');

    updates.resume_completeness = resZh.level;
    updates.resume_completeness_en = resEn.level;
    updates.resume_percent = resZh.score;
    updates.resume_percent_en = resEn.score;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true, skipped: true, user: currentUser }
  }

  updates.updatedAt = db.serverDate()

  // 确保 users 文档存在（若不存在则创建）
  const userRef = db.collection('users').doc(OPENID)
  try {
    await userRef.update({ data: updates })
  } catch (err) {
    // 如果文档不存在，先创建再更新
    const now = db.serverDate()
    await userRef.set({
      data: {
        openid: OPENID,
        isAuthed: false,
        phone: null,
        nickname: null,
        avatar: null,
        createdAt: now,
        updatedAt: now,
      },
    })
    await userRef.update({ data: updates })
  }

  const updated = await userRef.get()
  return { ok: true, user: updated.data }
}
