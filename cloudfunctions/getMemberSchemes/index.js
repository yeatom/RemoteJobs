const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const { OPENID } = cloud.getWXContext()

  try {
    // 获取用户语言设置
    let userLanguage = 'Chinese' // 默认中文
    if (OPENID) {
      try {
        const userRes = await db.collection('users').doc(OPENID).get()
        if (userRes.data && userRes.data.language) {
          userLanguage = userRes.data.language
        }
      } catch (err) {
        // 如果获取用户信息失败，使用默认语言
        console.error('获取用户语言失败:', err)
      }
    }

    // 判断是否为英文（English 或 AIEnglish）
    const isEnglish = userLanguage === 'English' || userLanguage === 'AIEnglish'

    const _ = db.command
    let result
    try {
      result = await db.collection('member_schemes')
        .where({
           type: _.neq('gift')
        })
        .orderBy('scheme_id', 'asc')
        .get()
    } catch (err) {
      // 如果集合不存在，返回空数组
      if (err.errCode === -502005 || err.message?.includes('not exist')) {
        console.warn('member_schemes 集合不存在，返回空数组')
        return {
          success: true,
          schemes: [],
        }
      }
      throw err
    }

    // 根据语言返回对应的名称
    const schemes = (result.data || []).map(scheme => {
      return {
        ...scheme,
        displayName: isEnglish ? (scheme.name_english || scheme.name) : scheme.name
      }
    })

    return {
      success: true,
      schemes: schemes,
    }
  } catch (err) {
    console.error('获取会员方案失败:', err)
    return {
      success: false,
      message: '获取会员方案失败',
      error: err.message,
      schemes: [],
    }
  }
}

