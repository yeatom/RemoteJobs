// miniprogram/pages/me/index.ts

import {isAiChineseUnlocked} from '../../utils/subscription'
import {normalizeLanguage, t, type AppLanguage} from '../../utils/i18n'
import {attachLanguageAware} from '../../utils/languageAware'
import {toDateMs} from '../../utils/time'


Page({
    data: {
        userInfo: null as WechatMiniprogram.UserInfo | null,
        isLoggedIn: false,
        phoneAuthBusy: false,


        showLanguageSheet: false,
        languageSheetOpen: false,
        currentLanguage: 'Chinese',
        isAiChineseUnlocked: false,

        showAiTranslateSheet: false,
        aiTranslateSheetOpen: false,
        aiTranslateLanguage: 'Default',

        showInviteSheet: false,
        inviteSheetOpen: false,
        myInviteCode: '',
        inputInviteCode: '',

        isVerified: false, // User verification status
        isMember: false, // Member status based on expiredDate
        expiredDate: null as any, // Member expired date
        expiredDateText: '', // Formatted expired date text

        showProfileSheet: false,
        profileSheetOpen: false,
        editingNickname: false,
        newNickname: '',

        ui: {} as Record<string, string>,
    },

    onLoad() {
        // subscribe once for this page instance
        ;(this as any)._langDetach = attachLanguageAware(this, {
            onLanguageRevive: () => {
                this.syncLanguageFromApp()
                // Immediately set navigation bar title when language changes
                wx.setNavigationBarTitle({ title: '' })

            },
        })
    },

    onUnload() {
        const fn = (this as any)._langDetach
        if (typeof fn === 'function') fn()
        ;
        (this as any)._langDetach = null
    },

    onShow() {
        // Use setTimeout to defer heavy operations and avoid blocking UI
        setTimeout(() => {
            this.syncUserFromApp()
            this.syncLanguageFromApp()
        }, 0)
    },

    syncUserFromApp() {
        const app = getApp<IAppOption>() as any
        const user = app?.globalData?.user

        const isLoggedIn = !!(user && (user.isAuthed || user.phone))
        const isVerified = !!(user && (user.isAuthed || user.phone)) // 认证状态：有手机号或已认证

        // 判断是否是会员：expiredDate 在未来
        const expired = user?.expiredDate
        const isMember = expired ? (() => {
            const ms = toDateMs(expired)
            return ms ? ms > Date.now() : false
        })() : false

        const hasCloudProfile = user && typeof user.avatar === 'string' && typeof user.nickname === 'string' && user.avatar && user.nickname
        const userInfo = hasCloudProfile
            ? ({ avatarUrl: user.avatar, nickName: user.nickname } as WechatMiniprogram.UserInfo)
            : null

        const isAiUnlocked = isAiChineseUnlocked(user)

        // Sync invite code if available
        const myInviteCode = user?.inviteCode || ''

        // Sync expired date
        const expiredDate = user?.expiredDate || null
        const expiredDateText = this.formatExpiredDate(expiredDate)

        this.setData({
            isLoggedIn,
            isVerified,
            isMember,
            userInfo,
            isAiChineseUnlocked: isAiUnlocked,
            myInviteCode,
            expiredDate,
            expiredDateText
        })
    },

    syncLanguageFromApp() {
        const app = getApp<IAppOption>() as any
        const lang = normalizeLanguage(app?.globalData?.language)

        const ui = {
            meTitle: t('me.title', lang),
            userNotLoggedIn: t('me.userNotLoggedIn', lang),
            generateResumeEntry: t('me.generateResumeEntry', lang),
            publishSkillEntry: t('me.publishSkillEntry', lang),
            aiTranslateEntry: t('me.aiTranslateEntry', lang),
            language: t('me.language', lang),
            inviteCodeEntry: t('me.inviteCodeEntry', lang),
            myInviteCode: t('me.myInviteCode', lang),
            inputInviteCode: t('me.inputInviteCode', lang),
            inviteCodeCopied: t('me.inviteCodeCopied', lang),
            inviteCodeInvalid: t('me.inviteCodeInvalid', lang),
            inviteCodeApplied: t('me.inviteCodeApplied', lang),
            comingSoon: t('me.comingSoon', lang),
            langDefault: t('me.langDefault', lang),
            langEnglish: t('me.langEnglish', lang),
            aiTranslateDefault: t('me.aiTranslateDefault', lang),
            langAI: t('me.langAI', lang),
            memberBadge: t('me.memberBadge', lang),
            uploadAvatar: t('me.uploadAvatar', lang),
            editNickname: t('me.editNickname', lang),
            memberExpiredDate: t('me.memberExpiredDate', lang),
        }

        // Chinese 表示中文（使用原始字段）
        // English 表示英文
        // AIChinese 表示AI翻译岗位-中文（使用翻译字段）
        // AIEnglish 表示AI翻译岗位-英文（使用翻译字段）
        // Language 弹窗只显示基础语言（Chinese/English），AI状态由 aiTranslateLanguage 单独控制
        this.setData({
            currentLanguage: lang === 'AIChinese' || lang === 'Chinese' ? 'Chinese' :
                lang === 'AIEnglish' || lang === 'English' ? 'English' :
                    'Chinese',  // 默认显示为中文选项
            aiTranslateLanguage: lang === 'AIChinese' || lang === 'AIEnglish' ? 'AIChinese' : 'Default',
            ui,
        })

        // intentionally do not set navigationBarTitleText
    },

    async onGetRealtimePhoneNumber(e: any) {
        if ((this.data as any).phoneAuthBusy) return

        const encryptedData = e?.detail?.encryptedData
        const iv = e?.detail?.iv
        if (!encryptedData || !iv) {
            wx.showToast({ title: '未获取到手机号授权', icon: 'none' })
            return
        }

        this.setData({ phoneAuthBusy: true })
        try {
            const res: any = await wx.cloud.callFunction({
                name: 'getPhoneNumber',
                data: { encryptedData, iv, mode: 'realtime' },
            })

            const phone = res?.result?.phone
            if (!phone) throw new Error('no phone in getPhoneNumber result')

            const updateRes: any = await wx.cloud.callFunction({
                name: 'updateUserProfile',
                data: { phone, isAuthed: true },
            })

            const updatedUser = updateRes?.result?.user
            const app = getApp<IAppOption>() as any
            if (app?.globalData) app.globalData.user = updatedUser

            this.syncUserFromApp()
            wx.showToast({ title: '登录成功', icon: 'success' })
        }
        catch (err) {
            wx.showToast({ title: '手机号授权失败', icon: 'none' })
        }
        finally {
            this.setData({ phoneAuthBusy: false })
        }
    },

    async onGetPhoneNumber(e: any) {
        if ((this.data as any).phoneAuthBusy) return

        const code = e?.detail?.code
        if (!code) {
            wx.showToast({ title: '未获取到手机号授权', icon: 'none' })
            return
        }

        this.setData({ phoneAuthBusy: true })
        try {
            const res: any = await wx.cloud.callFunction({
                name: 'getPhoneNumber',
                data: { code },
            })

            const phone = res?.result?.phone
            if (!phone) throw new Error('no phone in getPhoneNumber result')

            const updateRes: any = await wx.cloud.callFunction({
                name: 'updateUserProfile',
                data: { phone, isAuthed: true },
            })

            const updatedUser = updateRes?.result?.user
            const app = getApp<IAppOption>() as any
            if (app?.globalData) app.globalData.user = updatedUser

            this.syncUserFromApp()
            wx.showToast({ title: '登录成功', icon: 'success' })
        }
        catch (err) {
            wx.showToast({ title: '手机号授权失败', icon: 'none' })
        }
        finally {
            this.setData({ phoneAuthBusy: false })
        }
    },

    openLanguageSheet() {
        this.setData({ showLanguageSheet: true, languageSheetOpen: false })
        setTimeout(() => {
            this.setData({ languageSheetOpen: true })
        }, 30)
    },

    closeLanguageSheet() {
        this.setData({ languageSheetOpen: false })
        setTimeout(() => {
            this.setData({ showLanguageSheet: false })
        }, 260)
    },

    closeLanguageSheetImmediate() {
        // close with animation and unmount shortly after; don't await anything
        this.setData({ languageSheetOpen: false })
        setTimeout(() => {
            this.setData({ showLanguageSheet: false })
        }, 260)
    },

    async onLanguageSelect(e: WechatMiniprogram.TouchEvent) {
        const value = (e.currentTarget.dataset.value || '') as string
        if (!value) return

        // value 只可能是 'Chinese' 或 'English'
        // 需要结合当前 aiTranslateLanguage 来决定最终语言：
        // - Chinese + Default => Chinese
        // - English + Default => English
        // - Chinese + AIChinese => AIChinese
        // - English + AIChinese => AIEnglish
        const baseLang = value as 'Chinese' | 'English'
        const aiTranslate = this.data.aiTranslateLanguage
        
        let lang: AppLanguage
        if (aiTranslate === 'AIChinese') {
            lang = baseLang === 'Chinese' ? 'AIChinese' : 'AIEnglish'
        } else {
            lang = baseLang
        }
        
        const app = getApp<IAppOption>() as any

        // 如果选择的语言和当前语言相同，只关闭弹窗，不做任何操作
        const currentLang = normalizeLanguage(app?.globalData?.language)
        if (currentLang === lang) {
            this.closeLanguageSheetImmediate()
            return
        }

        // Check if AI features are unlocked
        if (aiTranslate === 'AIChinese' && !this.data.isAiChineseUnlocked) {
            this.closeLanguageSheetImmediate()
            wx.showModal({
                title: 'AI翻译功能 🔒',
                content: '该功能需要付费解锁。',
                confirmText: '去付费',
                cancelText: '取消',
                success: (res) => {
                    if (res.confirm) {
                        // TODO: replace with real payment flow.
                        wx.showToast({ title: '暂未接入付费流程', icon: 'none' })
                    }
                },
            })
            return
        }

        // 1) Close sheet immediately (no waiting)
        this.closeLanguageSheetImmediate()

        // 2) Show modal loading (blocks all touches)
        wx.showLoading({ title: '', mask: true })

        const minDuration = new Promise<void>((resolve) => setTimeout(resolve, 1500))

        // 3) Kick off language switch + persistence
        const action = (async () => {
            await app.setLanguage(lang)
            this.syncUserFromApp()
            this.syncLanguageFromApp()
        })()

        try {
            await Promise.all([minDuration, action])
            wx.hideLoading()
            wx.showToast({
                title: '语言已切换',
                icon: 'success',
                duration: 1500
            })
        }
        catch (err) {
            try {
                await action
            }
            finally {
                wx.hideLoading()
            }
        }
    },

    onLanguageTap() {
        this.openLanguageSheet()
    },

    onAiTranslateTap() {
        this.openAiTranslateSheet()
    },

    openAiTranslateSheet() {
        this.setData({ showAiTranslateSheet: true, aiTranslateSheetOpen: false })
        setTimeout(() => {
            this.setData({ aiTranslateSheetOpen: true })
        }, 30)
    },

    closeAiTranslateSheet() {
        this.setData({ aiTranslateSheetOpen: false })
        setTimeout(() => {
            this.setData({ showAiTranslateSheet: false })
        }, 260)
    },

    async onAiTranslateLanguageSelect(e: WechatMiniprogram.TouchEvent) {
        const value = (e.currentTarget.dataset.value || '') as string
        if (!value) return

        // value 只可能是 'Default' 或 'AIChinese'
        // 需要结合当前 currentLanguage 来决定最终语言：
        // - Chinese + Default => Chinese
        // - English + Default => English
        // - Chinese + AIChinese => AIChinese
        // - English + AIChinese => AIEnglish
        
        // 如果选择和当前状态相同，只关闭弹窗
        if (this.data.aiTranslateLanguage === value) {
            this.closeAiTranslateSheet()
            return
        }

        // Check if AI features are unlocked
        if (value === 'AIChinese' && !this.data.isAiChineseUnlocked) {
            this.closeAiTranslateSheet()
            wx.showModal({
                title: 'AI翻译功能 🔒',
                content: '该功能需要付费解锁。',
                confirmText: '去付费',
                cancelText: '取消',
                success: (res) => {
                    if (res.confirm) {
                        // TODO: replace with real payment flow.
                        wx.showToast({ title: '暂未接入付费流程', icon: 'none' })
                    }
                },
            })
            return
        }

        const baseLang = this.data.currentLanguage as 'Chinese' | 'English'
        let lang: AppLanguage
        if (value === 'AIChinese') {
            lang = baseLang === 'Chinese' ? 'AIChinese' : 'AIEnglish'
        } else {
            lang = baseLang
        }

        // 1) Close sheet immediately (no waiting)
        this.closeAiTranslateSheet()

        // 2) Show modal loading (blocks all touches)
        wx.showLoading({ title: '', mask: true })

        const minDuration = new Promise<void>((resolve) => setTimeout(resolve, 1500))

        const app = getApp<IAppOption>() as any

        // 3) Kick off language switch + persistence
        const action = (async () => {
            await app.setLanguage(lang)
            this.syncUserFromApp()
            this.syncLanguageFromApp()
        })()

        try {
            await Promise.all([minDuration, action])
            wx.hideLoading()
            wx.showToast({
                title: '设置已更新',
                icon: 'success',
                duration: 1500
            })
        }
        catch (err) {
            try {
                await action
            }
            finally {
                wx.hideLoading()
            }
        }
    },


    onInviteTap() {
        this.openInviteSheet()
    },

    openInviteSheet() {
        // Mount first, then open on next tick to trigger CSS transition.
        this.setData({ showInviteSheet: true, inviteSheetOpen: false })

        // Load user's invite code
        this.loadInviteCode()

        setTimeout(() => {
            this.setData({ inviteSheetOpen: true })
        }, 30)
    },

    closeInviteSheet() {
        this.setData({ inviteSheetOpen: false })
        setTimeout(() => {
            this.setData({ showInviteSheet: false })
        }, 260)
    },

    async loadInviteCode() {
        try {
            const app = getApp<IAppOption>() as any
            const user = app?.globalData?.user

            if (user?.inviteCode) {
                this.setData({ myInviteCode: user.inviteCode })
            }
            else {
                // Generate invite code if not exists
                const result = await wx.cloud.callFunction({
                    name: 'generateInviteCode',
                    data: {}
                })

                const resultData = result.result as any
                if (resultData?.inviteCode) {
                    this.setData({ myInviteCode: resultData.inviteCode })
                    // Update global user data
                    if (app?.globalData?.user) {
                        app.globalData.user.inviteCode = resultData.inviteCode
                    }
                }
            }
        }
        catch (err) {
            wx.showToast({ title: '加载邀请码失败', icon: 'none' })
        }
    },

    onCopyInviteCode() {
        const { myInviteCode, ui } = this.data
        if (!myInviteCode) return

        wx.setClipboardData({
            data: myInviteCode,
            success: () => {
                wx.showToast({ title: ui.inviteCodeCopied, icon: 'success' })
            },
            fail: () => {
                wx.showToast({ title: '复制失败', icon: 'none' })
            }
        })
    },

    onInviteCodeInput(e: any) {
        this.setData({ inputInviteCode: e.detail.value })
    },

    async onApplyInviteCode() {
        const { inputInviteCode, ui } = this.data
        if (!inputInviteCode || inputInviteCode.length !== 8) {
            wx.showToast({ title: ui.inviteCodeInvalid, icon: 'none' })
            return
        }

        try {
            const result = await wx.cloud.callFunction({
                name: 'applyInviteCode',
                data: { inviteCode: inputInviteCode }
            })

            const resultData = result.result as any
            if (resultData?.success) {
                wx.showToast({ title: ui.inviteCodeApplied, icon: 'success' })
                this.setData({ inputInviteCode: '' })
                this.closeInviteSheet()
            }
            else {
                wx.showToast({ title: resultData?.message || '应用失败', icon: 'none' })
            }
        }
        catch (err) {
            wx.showToast({ title: '应用失败', icon: 'none' })
        }
    },

    onAvatarTap() {
        if (!this.data.isLoggedIn) {
            wx.showToast({ title: '请先登录', icon: 'none' })
            return
        }
        this.openProfileSheet()
    },

    openProfileSheet() {
        const app = getApp<IAppOption>() as any
        const user = app?.globalData?.user
        const currentNickname = user?.nickname || ''

        this.setData({
            showProfileSheet: true,
            profileSheetOpen: false,
            newNickname: currentNickname,
            editingNickname: false,
        })

        setTimeout(() => {
            this.setData({ profileSheetOpen: true })
        }, 30)
    },

    closeProfileSheet() {
        this.setData({ profileSheetOpen: false })
        setTimeout(() => {
            this.setData({ showProfileSheet: false, editingNickname: false, newNickname: '' })
        }, 260)
    },

    async onUploadAvatar() {
        try {
            const res = await wx.chooseMedia({
                count: 1,
                mediaType: ['image'],
                sourceType: ['album', 'camera'],
            })

            if (!res.tempFiles || res.tempFiles.length === 0) return

            const tempFilePath = res.tempFiles[0].tempFilePath

            wx.showLoading({ title: '上传中...', mask: true })

            // Upload to cloud storage
            const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`
            const uploadRes = await wx.cloud.uploadFile({
                cloudPath,
                filePath: tempFilePath,
            })

            const fileID = uploadRes.fileID

            // Update user profile
            const updateRes: any = await wx.cloud.callFunction({
                name: 'updateUserProfile',
                data: { avatar: fileID },
            })

            const updatedUser = updateRes?.result?.user
            const app = getApp<IAppOption>() as any
            if (app?.globalData) app.globalData.user = updatedUser

            this.syncUserFromApp()
            wx.hideLoading()
            wx.showToast({ title: '头像更新成功', icon: 'success' })
        }
        catch (err: any) {
            wx.hideLoading()
            if (err.errMsg && err.errMsg.includes('cancel')) {
                // User cancelled, do nothing
                return
            }
            wx.showToast({ title: '上传失败', icon: 'none' })
        }
    },

    onEditNickname() {
        this.setData({ editingNickname: true })
    },

    onNicknameInput(e: any) {
        this.setData({ newNickname: e.detail.value })
    },

    async onSaveNickname() {
        const { newNickname } = this.data
        if (!newNickname || newNickname.trim().length === 0) {
            wx.showToast({ title: '用户名不能为空', icon: 'none' })
            return
        }

        if (newNickname.length > 20) {
            wx.showToast({ title: '用户名不能超过20个字符', icon: 'none' })
            return
        }

        try {
            wx.showLoading({ title: '保存中...', mask: true })
            const updateRes: any = await wx.cloud.callFunction({
                name: 'updateUserProfile',
                data: { nickname: newNickname.trim() },
            })

            const updatedUser = updateRes?.result?.user
            const app = getApp<IAppOption>() as any
            if (app?.globalData) app.globalData.user = updatedUser

            this.syncUserFromApp()
            this.setData({ editingNickname: false })
            wx.hideLoading()
            wx.showToast({ title: '用户名更新成功', icon: 'success' })
        }
        catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '更新失败', icon: 'none' })
        }
    },

    onCancelEditNickname() {
        const app = getApp<IAppOption>() as any
        const user = app?.globalData?.user
        const currentNickname = user?.nickname || ''
        this.setData({ editingNickname: false, newNickname: currentNickname })
    },

    onRenewMember() {
        this.closeProfileSheet()
        // TODO: 跳转到续费页面
        wx.showToast({ title: '暂未接入付费流程', icon: 'none' })
    },

    formatExpiredDate(expired: any): string {
        if (!expired) return '未开通'
        const ms = toDateMs(expired)
        if (!ms) return '未开通'
        const date = new Date(ms)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    },
})
