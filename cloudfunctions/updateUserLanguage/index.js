// cloudfunctions/updateUserLanguage/index.js
// Update user's language preference (Chinese/English)

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { OPENID } = cloud.getWXContext()

  const language = event?.language
  if (language !== 'Chinese' && language !== 'English' && language !== 'AIChinese' && language !== 'AIEnglish') {
    return { ok: false, error: 'invalid_language' }
  }

  const userRef = db.collection('users').doc(OPENID)

  try {
    await userRef.update({
      data: {
        language,
        updatedAt: db.serverDate(),
      },
    })
  } catch (err) {
    // Ensure user doc exists
    const now = db.serverDate()
    await userRef.set({
      data: {
        openid: OPENID,
        isAuthed: false,
        phone: null,
        nickname: null,
        avatar: null,
        language,
        createdAt: now,
        updatedAt: now,
      },
    })
  }

  const updated = await userRef.get()
  return { ok: true, user: updated.data }
}
