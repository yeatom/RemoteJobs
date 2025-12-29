const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { OPENID } = cloud.getWXContext()

  const userRef = db.collection('users').doc(OPENID)

  try {
    const existing = await userRef.get()
    const user = existing?.data || {}

    if (!user.language) {
      await userRef.update({
        data: {
          language: 'Chinese',
          updatedAt: db.serverDate(),
        },
      })
      const updated = await userRef.get()
      return { openid: OPENID, user: updated.data }
    }

    return { openid: OPENID, user }
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
    const userData = {
        openid: OPENID,
        isAuthed: false,
        phone: null,
        nickname: null,
        avatar: null,
        language: 'Chinese',
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
