const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { inviteCode } = event

  if (!openid) {
    return {
      success: false,
      message: '无法获取用户身份'
    }
  }

  if (!inviteCode || inviteCode.length !== 8) {
    return {
      success: false,
      message: '邀请码格式不正确'
    }
  }

  try {
    const inviteUserResult = await db.collection('users').where({
      inviteCode: inviteCode
    }).get()

    if (inviteUserResult.data.length === 0) {
      return {
        success: false,
        message: '邀请码不存在'
      }
    }

    const inviteUser = inviteUserResult.data[0]
    if (inviteUser.openid === openid) {
      return {
        success: false,
        message: '不能使用自己的邀请码'
      }
    }

    const currentUserResult = await db.collection('users').where({
      openid: openid
    }).get()

    if (currentUserResult.data.length > 0) {
      const currentUser = currentUserResult.data[0]
      if (currentUser.invitedBy) {
        return {
          success: false,
          message: '您已经使用过邀请码'
        }
      }

      await db.collection('users').doc(currentUser._id).update({
        data: {
          invitedBy: inviteUser.openid,
          invitedAt: new Date(),
          updatedAt: new Date()
        }
      })

      const inviteCount = inviteUser.inviteCount || 0
      await db.collection('users').doc(inviteUser._id).update({
        data: {
          inviteCount: inviteCount + 1,
          updatedAt: new Date()
        }
      })

      return {
        success: true,
        message: '邀请码应用成功'
      }
    } else {
      return {
        success: false,
        message: '用户记录不存在，请先完成注册'
      }
    }

  } catch (err) {
    return {
      success: false,
      message: '应用邀请码失败'
    }
  }
}
