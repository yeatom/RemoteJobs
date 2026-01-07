// cloudfunctions/getPhoneNumber/index.js
// 使用 code 换取手机号（仅支持 code 方式）

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { code } = event || {}

  console.log('[PhoneAuth] Request received:', {
    hasCode: !!code,
    codeLength: code?.length,
    codeType: typeof code,
  })

  if (!code || typeof code !== 'string' || code.length === 0) {
    console.error('[PhoneAuth] Missing or invalid code')
    return { 
      ok: false, 
      error: 'missing code',
      errcode: -1
    }
  }

  // 使用微信云开发提供的 openapi 获取手机号
  try {
    const result = await cloud.openapi.phonenumber.getPhoneNumber({
      code: code
    })

    console.log('[PhoneAuth] openapi.phonenumber.getPhoneNumber response:', {
      errCode: result?.errCode,
      errMsg: result?.errMsg,
      hasPhoneInfo: !!result?.phoneInfo,
      phoneInfoKeys: result?.phoneInfo ? Object.keys(result.phoneInfo) : [],
      fullResult: result,
    })

    // 检查错误码（注意：微信返回的是 errCode 和 errMsg，不是 errcode 和 errmsg）
    if (result?.errCode !== undefined && result.errCode !== 0) {
      console.error('[PhoneAuth] API returned error:', {
        errCode: result.errCode,
        errMsg: result.errMsg,
        fullResult: result,
      })
      return { 
        ok: false, 
        error: result.errMsg || '获取手机号失败', 
        errcode: result.errCode 
      }
    }

    // 检查是否有手机号信息（注意：微信返回的是 phoneInfo，不是 phone_info）
    if (!result?.phoneInfo) {
      console.error('[PhoneAuth] No phoneInfo in result:', result)
      return { 
        ok: false, 
        error: '未返回手机号信息', 
        errcode: -2,
        rawResult: result
      }
    }

    const phone = result.phoneInfo.phoneNumber || result.phoneInfo.purePhoneNumber
    if (!phone) {
      console.error('[PhoneAuth] No phone number in phoneInfo:', result.phoneInfo)
      return { 
        ok: false, 
        error: '手机号信息为空', 
        errcode: -3,
        phoneInfo: result.phoneInfo
      }
    }

    console.log('[PhoneAuth] Success, phone:', phone)
    return { ok: true, phone }
  } catch (err) {
    console.error('[PhoneAuth] openapi error:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    })
    return { 
      ok: false, 
      error: '调用微信接口失败', 
      details: err.message,
      errcode: -4
    }
  }
}
