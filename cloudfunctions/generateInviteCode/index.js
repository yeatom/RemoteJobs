const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

function generateInviteCode(openid) {
  let hash = 0
  for (let i = 0; i < openid.length; i++) {
    const char = openid.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  const positiveHash = Math.abs(hash)
  const code = positiveHash.toString(36).toUpperCase().padStart(8, '0').slice(-8)

  return code
}

async function checkInviteCodeExists(inviteCode) {
  try {
    const result = await db.collection('users').where({
      inviteCode: inviteCode
    }).count()

    return result.total > 0
  } catch (err) {
    return false
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return {
      success: false,
      message: '无法获取用户身份'
    }
  }

  try {
    const userResult = await db.collection('users').where({
      openid: openid
    }).get()

    if (userResult.data.length > 0 && userResult.data[0].inviteCode) {
      return {
        success: true,
        inviteCode: userResult.data[0].inviteCode
      }
    }

    let inviteCode = generateInviteCode(openid)
    let attempts = 0
    const maxAttempts = 10

    while (await checkInviteCodeExists(inviteCode) && attempts < maxAttempts) {
      inviteCode = generateInviteCode(openid + Math.random().toString())
      attempts++
    }

    if (attempts >= maxAttempts) {
      return {
        success: false,
        message: '生成邀请码失败，请重试'
      }
    }

    if (userResult.data.length > 0) {
      await db.collection('users').doc(userResult.data[0]._id).update({
        data: {
          inviteCode: inviteCode,
          updatedAt: new Date()
        }
      })
    } else {
      await db.collection('users').add({
        data: {
          openid: openid,
          inviteCode: inviteCode,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    return {
      success: true,
      inviteCode: inviteCode
    }

  } catch (err) {
    return {
      success: false,
      message: '生成邀请码失败'
    }
  }
}
