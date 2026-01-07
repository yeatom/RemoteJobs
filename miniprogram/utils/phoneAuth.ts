// miniprogram/utils/phoneAuth.ts
// 手机号授权相关工具函数（仅使用 code 方式）

interface PhoneAuthDetail {
    code?: string
    errMsg?: string
}

interface GetPhoneNumberResult {
    ok: boolean
    phone?: string
    error?: string
    errcode?: number
}

/**
 * 从授权数据中获取手机号（仅使用 code 方式）
 */
export async function getPhoneNumberFromAuth(detail: PhoneAuthDetail): Promise<string | undefined> {
    const code = detail?.code

    console.log('[PhoneAuth] Event detail:', {
        hasCode: !!code,
        codeLength: code?.length,
        errMsg: detail?.errMsg,
    })

    const hasCodeData = code && typeof code === 'string' && code.length > 0

    if (!hasCodeData) {
        console.warn('[PhoneAuth] Missing code')
        wx.showToast({ title: '未获取到手机号授权', icon: 'none' })
        return undefined
    }

    console.log('[PhoneAuth] Using code authorization')
    return await getPhoneNumberByCode(code)
}

/**
 * 使用 code 方式获取手机号
 */
async function getPhoneNumberByCode(code: string): Promise<string | undefined> {
    console.log('[PhoneAuth] Calling cloud function with code')
    
    const res: any = await wx.cloud.callFunction({
        name: 'getPhoneNumber',
        data: { code },
    })

    console.log('[PhoneAuth] Cloud function response:', res?.result)

    const result: GetPhoneNumberResult = res?.result
    if (!result?.ok) {
        const errorMsg = result?.error || '获取手机号失败'
        const errcode = result?.errcode
        
        console.error('[PhoneAuth] Failed:', {
            error: errorMsg,
            errcode: errcode,
            fullResult: result,
        })
        
        // 根据错误码提供更详细的错误信息
        if (errcode) {
            throw new Error(`获取手机号失败 (错误码: ${errcode}): ${errorMsg}`)
        } else {
            throw new Error(errorMsg)
        }
    }

    if (!result.phone) {
        console.error('[PhoneAuth] No phone in result:', result)
        throw new Error('未获取到手机号')
    }

    console.log('[PhoneAuth] Success, phone:', result.phone)
    return result.phone
}

/**
 * 更新用户手机号
 */
export async function updatePhoneNumber(phone: string): Promise<void> {
    const updateRes: any = await wx.cloud.callFunction({
        name: 'updateUserProfile',
        data: { phone, isAuthed: true },
    })

    if (!updateRes?.result?.ok) {
        console.error('[PhoneAuth] Update profile failed:', updateRes?.result)
        throw new Error('更新用户信息失败')
    }

    const updatedUser = updateRes?.result?.user
    if (!updatedUser) {
        console.error('[PhoneAuth] No user data returned:', updateRes?.result)
        throw new Error('更新用户信息失败：未返回用户数据')
    }

    const app = getApp<IAppOption>() as any
    if (app?.globalData) app.globalData.user = updatedUser
}
