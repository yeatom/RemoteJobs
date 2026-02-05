// miniprogram/pages/me/index.ts

import {isAiChineseUnlocked} from '../../utils/subscription'
import {normalizeLanguage, type AppLanguage} from '../../utils/i18n'
import {attachLanguageAware} from '../../utils/languageAware'
import {toDateMs} from '../../utils/time'
import {getPhoneNumberFromAuth, updatePhoneNumber} from '../../utils/phoneAuth'
import {callApi, formatFileUrl} from '../../utils/request'
import {ui} from '../../utils/ui'
import * as UIConfig from './ui.config'


Page({
    data: {
        userInfo: null as { avatar: string, nickName: string } | null,
        isInitialLoading: true,
        phoneAuthBusy: false,
        isLogin: false, // 是否已登录
        isLoggedIn: false, // 全局登录墙控制
        isBeta: false, // 是否测试环境

        showLanguageSheet: false,
        languageSheetOpen: false,
        appLanguage: 'Chinese' as AppLanguage,
        tempLanguage: 'Chinese' as AppLanguage,
        isLanguageChanged: false,
        isAiChineseUnlocked: false,

        showInviteSheet: false,
        inviteSheetOpen: false,
        isInviteCodeValid: false,
        myInviteCode: '',
        inputInviteCode: '',

        showContactSheet: false,
        contactSheetOpen: false,

        isVerified: false, // User verification status
        isMember: false, // Member status based on expiredDate
        expiredDate: null as any, // Member expired date
        expiredDateText: '', // Formatted expired date text
        memberLevel: 0, // 0:普通用户, 1:3天会员, 2:普通月卡, 3:高级月卡
        memberBadgeText: '', // 会员徽章文本（从数据库查询）
        memberExpiryText: '', // 会员到期时间文案

        // Quota info
        resumeQuotaUsed: 0,
        resumeQuotaLimit: 0,
        resumeQuotaProgress: 0,
        totalBalance: 0,
        displayLimit: 0,
        
        // Upgrade info
        upgradeAmount: 0, // 补差价金额
        isQuotaExhausted: false, // 额度是否耗尽

        // Product info
        schemsList: [] as any[],
        selectedSchemeId: 0,
        selectedScheme: null as any,
        isCalculatingPrice: false,
        finalPrice: 0,
        originalPrice: 0,
        isUpgradeOrder: false,

        showMemberHub: false,
        memberHubOpen: false,

        showProfileSheet: false,
        profileSheetOpen: false,
        showNicknameModal: false,
        nicknameModalOpen: false,
        newNickname: '',
        userPhone: '', // 原始手机号
        maskedPhone: '', // 脱敏后的手机号

        ui: {} as Record<string, string>,
    },

    onLoad() {
        const app = getApp<IAppOption>() as any
        
        ;(this as any)._langDetach = attachLanguageAware(this, {
            onLanguageRevive: () => {
                this.syncLanguageFromApp()
                wx.setNavigationBarTitle({ title: '' })
            },
        })

        // 关键：监听全局用户状态变化
        if (app.onUserChange) {
            (this as any)._userListener = (user: any) => {
                console.log('[Me] User globally updated, syncing UI...')
                this.syncUserFromApp()
            }
            app.onUserChange((this as any)._userListener)
        }
    },

    onUnload() {
        const app = getApp<IAppOption>() as any
        const fn = (this as any)._langDetach
        if (typeof fn === 'function') fn()
        ;
        (this as any)._langDetach = null

        if (app.offUserChange && (this as any)._userListener) {
            app.offUserChange((this as any)._userListener)
        }
    },

    onShow() {
        if (typeof this.getTabBar === 'function') {
            const tabBar = this.getTabBar();
            if (tabBar) {
                tabBar.setData({ selected: 2 });
            }
        }

        this.syncLoginState()
        this.initPage()
        
        const app = getApp<IAppOption>() as any
        
        // --- Interceptors for Cross-Page Actions ---
        if (app.globalData && app.globalData.openMemberHubOnShow) {
             app.globalData.openMemberHubOnShow = false
             // Small delay to ensure page is ready
             setTimeout(() => {
                 this.openMemberHub()
             }, 300)
        }

        if (app.globalData && app.globalData._openProfileOnShow) {
            app.globalData._openProfileOnShow = false
            setTimeout(() => {
                this.openProfileSheet()
            }, 300)
        }
    },

    syncLoginState() {
        const app = getApp<any>();
        const user = app.globalData.user;
        const bootStatus = app.globalData.bootStatus;
        const loggedIn = !!(user && user.phoneNumber && bootStatus === 'success');
        
        console.log('[Me] syncLoginState:', {
            hasUser: !!user,
            hasPhone: !!user?.phoneNumber,
            bootStatus,
            loggedIn
        });

        this.setData({
            isLoggedIn: loggedIn,
            isLogin: loggedIn
        });
    },

    onLoginSuccess() {
        this.syncLoginState();
        this.initPage();
    },

    async initPage() {
        // 设置一个安全定时器，防止无限加载
        const safetyTimer = setTimeout(() => {
            if (this.data.isInitialLoading) {
                console.warn('initPage safety timeout triggered');
                this.setData({ isInitialLoading: false });
            }
        }, 5000);

        try {
            const app = getApp<IAppOption>()
            if (app.globalData.userPromise) {
                // 延长等待时间到 10 秒，确保登录逻辑有足够时间完成
                await Promise.race([
                    app.globalData.userPromise,
                    new Promise(resolve => setTimeout(resolve, 10000))
                ]);
            }
            
            this.syncLanguageFromApp()
            this.syncUserFromApp()
            
            // 如果是会员，显式等待徽章文本加载，防止闪烁
            const membership = (app as any)?.globalData?.user?.membership
            if (membership && membership.level > 0) {
                await Promise.race([
                    this.loadMemberBadgeText(membership.level),
                    new Promise(resolve => setTimeout(resolve, 2000))
                ]);
            }
        } catch (err) {
            console.error('initPage error:', err)
        } finally {
            clearTimeout(safetyTimer);
            this.setData({ isInitialLoading: false })
        }
    },

    syncUserFromApp() {
        const app = getApp<IAppOption>() as any
        const user = app?.globalData?.user

        const isVerified = !!(user && user.phoneNumber) // 认证状态：有手机号

        // 使用新包裹字段 membership
        const membership = user?.membership
        const memberLevel = membership?.level || 0
        // 统一使用 expire_at
        const memberExpireAt = membership?.expire_at
        
        // 判断是否是有效会员：memberLevel > 0 且未过期
        let isMember = false
        let expiredDate = null
        if (memberLevel > 0) {
            if (memberExpireAt) {
                const ms = toDateMs(memberExpireAt)
                if (ms && ms > Date.now()) {
                    isMember = true
                    expiredDate = memberExpireAt
                } else if (!ms) {
                    // 如果日期格式解析失败，但等级大于0，暂且视为会员
                    isMember = true
                }
            } else {
                // 如果等级大于0但没有过期时间，暂且视为会员
                isMember = true
            }
        }

        const uiStrings = this.data.ui || {}
        const userInfo = user ? ({ 
            avatar: formatFileUrl(user.avatar) || '', 
            nickName: user.nickname || uiStrings.loginNow || '' 
        }) : null

        const isAiUnlocked = isAiChineseUnlocked(user)

        // Sync invite code if available
        const myInviteCode = user?.inviteCode || ''

        // Sync expired date
        const expiredDateText = this.formatExpiredDate(expiredDate)
        const memberExpiryText = isMember ? `${uiStrings.memberExpiredDate || ''}: ${expiredDateText}` : ''

        // Format phone number (前3位+****+后4位)
        const rawPhone = user?.phone || ''
        const maskedPhone = this.formatPhoneNumber(rawPhone)

        // Quota logic - Using pts_quota + topup_quota
        const activeQuota = membership?.pts_quota
        const topupQuota = membership?.topup_quota || 0
        const topupLimit = membership?.topup_limit || topupQuota // 记录的总额度，若无则取当前余量
        const now = new Date();
        const isMemberActive = expiredDate && new Date(expiredDate) > now;

        const resumeQuotaUsed = activeQuota?.used || 0
        let resumeQuotaLimit = activeQuota?.limit || 0
        
        // Calculate Remaining Points: 
        // If member active: (Limit - Used) + Topup
        // If expired: Only Topup
        const subscriptionBalance = isMemberActive ? Math.max(0, resumeQuotaLimit - resumeQuotaUsed) : 0
        const totalBalance = subscriptionBalance + topupQuota

        // 动态上限：会员基础额度 + 加油包历史总额度
        const displayLimit = (isMemberActive ? resumeQuotaLimit : 0) + topupLimit
        
        // Progress percentage (Points / Total Limit)
        const resumeQuotaProgress = displayLimit > 0 ? Math.min(100, (totalBalance / displayLimit) * 100) : 0
        const isQuotaExhausted = totalBalance <= 0
        
        // Format quota text
        const resumeQuotaText = `${totalBalance} ${uiStrings.points || 'pts'}`

        const systemConfig = app?.globalData?.systemConfig || { isBeta: true }

        this.setData({
            isLogin: !!user,
            isVerified,
            isMember,
            memberLevel,
            userInfo,
            userPhone: rawPhone,
            isAiChineseUnlocked: isAiUnlocked,
            myInviteCode,
            expiredDate,
            expiredDateText,
            memberExpiryText,
            maskedPhone,
            resumeQuotaUsed,
            resumeQuotaLimit,
            totalBalance, 
            displayLimit,
            resumeQuotaText,
            resumeQuotaProgress, // Remaining %
            isQuotaExhausted,
            isBeta: !!systemConfig.isBeta
        })

        // 加载会员徽章及差价逻辑
        this.loadMemberBadgeText(memberLevel)
    },

    syncLanguageFromApp() {
        const app = getApp<IAppOption>() as any
        const lang = normalizeLanguage(app?.globalData?.language)

        const uiStrings = UIConfig.buildPageUI(lang, this.data)

        this.setData({
            appLanguage: lang,
            ui: uiStrings,
        })

        // intentionally do not set navigationBarTitleText
        
        // 语言切换时重新加载徽章文本
        const currentMemberLevel = (this.data as any).memberLevel || 0
        this.loadMemberBadgeText(currentMemberLevel)
    },

    async loadMemberBadgeText(memberLevel?: number) {
        if (memberLevel === undefined) {
            const app = getApp<IAppOption>() as any
            const user = app?.globalData?.user
            memberLevel = (this.data as any).memberLevel || user?.membership?.level || 0
        }

        if (memberLevel === 0) {
            this.setData({ memberBadgeText: '' })
            return
        }

        try {
            const app = getApp<any>()
            const prefetched = app.globalData.prefetchedData
            let schemes = this.data.schemsList || []
            let userScheme = (this as any)._cachedUserScheme || null

            // 1. 优先使用已有的缓存数据
            if (schemes.length === 0 && prefetched?.memberSchemes?.length > 0) {
                schemes = prefetched.memberSchemes
                this.setData({ schemsList: schemes })
            }

            // 2. 如果彻底没有数据且不在请求中，才通过 API 获取
            if (schemes.length === 0 && !(this as any)._schemesLoading) {
                (this as any)._schemesLoading = callApi('getMemberSchemes', {}).then(res => {
                    const result = res.result || (res as any)
                    if (result?.success) {
                        const sList = result.schemes || []
                        this.setData({ schemsList: sList })
                        if (result.userScheme) (this as any)._cachedUserScheme = result.userScheme
                        return result
                    }
                    return null
                }).finally(() => {
                    (this as any)._schemesLoading = null
                })
            }

            // 如果正在请求，等待请求完成
            let resultData: any = null
            if ((this as any)._schemesLoading) {
                resultData = await (this as any)._schemesLoading
            }

            // 3. 确定最终使用的 scheme 对象
            const targetScheme = ((this as any)._cachedUserScheme || resultData?.userScheme)
            let scheme = (targetScheme?.scheme_id === memberLevel) 
                         ? targetScheme 
                         : schemes.find((s: any) => s.scheme_id === memberLevel)

            const isChinese = this.data.appLanguage === 'Chinese' || this.data.appLanguage === 'AIChinese'
            let memberBadgeText = ''
            
            if (scheme) {
                memberBadgeText = isChinese ? scheme.name_chinese : scheme.name_english
            } else if (memberLevel === 1) {
                // 特殊处理：Level 1 通常是后台过滤掉的“试用期”，给个默认文案
                memberBadgeText = isChinese ? '体验成员' : 'Trial Member'
            }

            this.setData({ 
                memberBadgeText,
                ['ui.memberRenewContent']: UIConfig.buildPageUI(this.data.appLanguage as any, { ...this.data, memberBadgeText }).memberRenewContent
            })

            // 计算升级差价 (仅在有方案列表时计算)
            if (schemes.length > 0) {
                // ... 保持原有差价计算逻辑 ...
                this.calculateUpgradeAmount(memberLevel, schemes, scheme)
            }
        } catch (err) {
            console.error('[Me] loadMemberBadgeText error:', err)
        }
    },

    /**
     * 独立出升级差价计算逻辑，保持主函数清爽
     */
    calculateUpgradeAmount(memberLevel: number, schemes: any[], currentScheme: any) {
        if (!currentScheme) return
        
        let targetLevel = 0
        if (memberLevel === 1) targetLevel = 2
        else if (memberLevel === 2) targetLevel = 3

        if (targetLevel > 0) {
            const target = schemes.find((s: any) => s.scheme_id === targetLevel)
            if (target) {
                const diff = (target.price || 0) - (currentScheme.price || 0)
                const amount = diff > 0 ? diff : 0
                this.setData({ 
                    upgradeAmount: amount,
                    ['ui.upgradeGuide']: UIConfig.buildPageUI(this.data.appLanguage as any, { ...this.data, upgradeAmount: amount }).upgradeGuide
                })
            }
        }
    },

    async onGetRealtimePhoneNumber(e: any) {
        const { ui: uiStrings } = this.data
        if ((this.data as any).phoneAuthBusy) return

        const encryptedData = e?.detail?.encryptedData
        const iv = e?.detail?.iv
        if (!encryptedData || !iv) {
            ui.showToast(uiStrings.authCancel || 'Cancelled')
            return
        }

        this.setData({ phoneAuthBusy: true })
        try {
            const res = await callApi('getPhoneNumber', { encryptedData, iv, mode: 'realtime' })

            const result = res.result || (res as any)
            const phone = result?.phone
            if (!phone) throw new Error('no phone in getPhoneNumber result')

            const updateRes = await callApi('updateUserProfile', { phone, isAuthed: true })

            const updateResult = updateRes.result || (updateRes as any)
            const updatedUser = updateResult?.user
            const app = getApp<IAppOption>() as any
            if (app?.globalData) app.globalData.user = updatedUser

            this.syncUserFromApp()
            ui.showSuccess(uiStrings.loginSuccess || 'Success')
        }
        catch (err) {
            ui.showToast(uiStrings.phoneAuthFailed || 'Failed')
        }
        finally {
            this.setData({ phoneAuthBusy: false })
        }
    },

    async onGetPhoneNumber(e: any) {
        const { ui: uiStrings } = this.data
        if ((this.data as any).phoneAuthBusy) return

        const code = e?.detail?.code
        if (!code) {
            ui.showToast(uiStrings.authCancel || 'Cancelled')
            return
        }

        this.setData({ phoneAuthBusy: true })
        try {
            const res: any = await callApi('getPhoneNumber', { code })

            const phone = res?.result?.phone
            if (!phone) throw new Error('no phone in getPhoneNumber result')

            const updateRes: any = await callApi('updateUserProfile', { phone, isAuthed: true })

            const updatedUser = updateRes?.result?.user
            const app = getApp<IAppOption>() as any
            if (app?.globalData) app.globalData.user = updatedUser

            this.syncUserFromApp()
            ui.showSuccess(uiStrings.loginSuccess || 'Success')
        }
        catch (err) {
            ui.showToast(uiStrings.phoneAuthFailed || 'Failed')
        }
        finally {
            this.setData({ phoneAuthBusy: false })
        }
    },

    openLanguageSheet() {
        this.setData({ 
            showLanguageSheet: true,
            tempLanguage: this.data.appLanguage,
            isLanguageChanged: false
        })
    },

    closeLanguageSheet() {
        this.setData({ showLanguageSheet: false })
    },

    async onLanguageConfirm(e: any) {
        const { complete } = e.detail;
        const { tempLanguage, appLanguage, ui: uiStrings } = this.data
        
        if (tempLanguage === appLanguage) {
            complete()
            return
        }

        const app = getApp<IAppOption>() as any
        
        try {
            await app.setLanguage(tempLanguage)
            this.syncUserFromApp()
            this.syncLanguageFromApp()
            complete()
            ui.showSuccess(uiStrings.updateSuccess)
        } catch (err) {
            complete()
            ui.showError(uiStrings.updateFailed)
        }
    },

    async onLanguageSelect(e: WechatMiniprogram.TouchEvent) {
        const { ui: uiStrings, appLanguage } = this.data
        const lang = (e.currentTarget.dataset.value || '') as AppLanguage
        if (!lang) return

        // Check if AI features are unlocked
        if (lang.startsWith('AI') && !this.data.isAiChineseUnlocked) {
            wx.showModal({
                title: uiStrings.aiUnlockTitle,
                content: uiStrings.aiUnlockContent,
                confirmText: uiStrings.toPay,
                cancelText: uiStrings.cancel,
                success: (res) => {
                    if (res.confirm) {
                        this.closeLanguageSheet()
                        this.openMemberHub()
                    }
                },
            })
            return
        }

        this.setData({
            tempLanguage: lang,
            isLanguageChanged: lang !== appLanguage
        })
    },

    onLanguageTap() {
        this.openLanguageSheet()
    },

    onInviteTap() {
        this.openInviteSheet()
    },

    openInviteSheet() {
        // Load user's invite code
        this.loadInviteCode()
        this.setData({ showInviteSheet: true })
    },

    closeInviteSheet() {
        this.setData({ showInviteSheet: false })
    },

    onInviteConfirm(e: any) {
        const { complete, fail } = e.detail;
        if (this.data.isInviteCodeValid) {
            this.onApplyInviteCode(complete, fail);
        } else {
            complete();
        }
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
                const result = await callApi('generateInviteCode', {})

                const resultData = result?.result as any
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
            ui.showToast(this.data.ui.loadInviteCodeFailed)
        }
    },

    onCopyInviteCode() {
        const { myInviteCode, ui: uiStrings } = this.data
        if (!myInviteCode) return

        wx.setClipboardData({
            data: myInviteCode,
            success: () => {
                ui.showToast(uiStrings.inviteCodeCopied)
            }
        })
    },

    onContactAuthor() {
        this.setData({
            showContactSheet: true
        })
    },

    closeContactSheet() {
        this.setData({
            showContactSheet: false
        })
    },

    onContactConfirm(e: any) {
        const { complete } = e.detail;
        complete();
    },

    onInviteCodeInput(e: any) {
        const value = e.detail.value;
        this.setData({ 
            inputInviteCode: value,
            isInviteCodeValid: value && value.length === 6
        })
    },

    async onApplyInviteCode(complete?: Function, fail?: Function) {
        const { inputInviteCode, ui: uiStrings } = this.data
        if (!inputInviteCode || inputInviteCode.length !== 6) {
            ui.showToast(uiStrings.inviteCodeInvalid)
            if (fail) fail()
            return
        }

        try {
            const result = await callApi('applyInviteCode', { targetInviteCode: inputInviteCode })

            if (result?.success) {
                ui.showToast(result.message || uiStrings.inviteCodeApplied)
                this.setData({ 
                    inputInviteCode: '',
                    isInviteCodeValid: false
                })
                if (complete) complete()
                // 兑换成功后刷新界面数据
                this.onLoad()
            }
            else {
                ui.showToast(result?.message || uiStrings.applyFailed)
                if (fail) fail()
            }
        }
        catch (err: any) {
            console.error('Apply invite code error:', err)
            // 处理后端返回的错误信息（如 400/404/500 等）
            const errorMessage = err?.data?.message || uiStrings.applyFailed
            ui.showToast(errorMessage)
            if (fail) fail()
        }
    },

    onAvatarTap() {
        this.openProfileSheet()
    },

    openProfileSheet() {
        const app = getApp<IAppOption>() as any
        const user = app?.globalData?.user
        const currentNickname = user?.nickname || ''

        this.setData({
            showProfileSheet: true,
            newNickname: currentNickname,
        })
    },

    closeProfileSheet() {
        this.setData({ showProfileSheet: false, newNickname: '' })
    },

    onProfileConfirm(e: any) {
        const { complete } = e.detail;
        complete();
    },

    async onUploadAvatar() {
        const { ui: uiStrings } = this.data
        try {
            const res = await wx.chooseMedia({
                count: 1,
                mediaType: ['image'],
                sourceType: ['album', 'camera'],
            })

            if (!res.tempFiles || res.tempFiles.length === 0) return

            const tempFilePath = res.tempFiles[0].tempFilePath

            ui.showLoading(uiStrings.uploading)

            // Upload to our Express server instead of cloud storage
            wx.uploadFile({
                url: 'https://feiwan.online/api/upload',
                filePath: tempFilePath,
                name: 'file',
                header: {
                    'x-openid': wx.getStorageSync('user_openid')
                },
                success: async (uploadRes) => {
                    try {
                        const data = JSON.parse(uploadRes.data)
                        if (data.success) {
                            const fileID = data.url
                            const updateRes: any = await callApi('updateUserProfile', { avatar: fileID })
                            const updatedUser = updateRes?.result?.user
                            const app = getApp<IAppOption>() as any
                            if (app?.globalData) app.globalData.user = updatedUser

                            this.syncUserFromApp()
                            ui.hideLoading()
                            ui.showSuccess(uiStrings.uploadSuccess)
                        } else {
                            throw new Error(data.message || 'Upload failed')
                        }
                    } catch (e) {
                        ui.hideLoading()
                        ui.showToast(uiStrings.uploadFailed)
                    }
                },
                fail: (err) => {
                    console.error('Upload failed:', err)
                    ui.hideLoading()
                    ui.showToast(uiStrings.uploadFailed)
                }
            })
        }
        catch (err: any) {
            if (err.errMsg && err.errMsg.includes('cancel')) {
                // User cancelled, do nothing
                return
            }
            ui.hideLoading()
            ui.showToast(uiStrings.uploadFailed)
        }
    },

    onEditNickname() {
        const app = getApp<IAppOption>() as any
        const user = app?.globalData?.user
        const currentNickname = user?.nickname || ''
        
        this.setData({
            showNicknameModal: true,
            nicknameModalOpen: false,
            newNickname: currentNickname
        })
        
        setTimeout(() => {
            this.setData({ nicknameModalOpen: true })
        }, 30)
    },

    closeNicknameModal() {
        this.setData({ nicknameModalOpen: false })
        setTimeout(() => {
            this.setData({ showNicknameModal: false })
        }, 300)
    },

    onNicknameInput(e: any) {
        this.setData({ newNickname: e.detail.value })
    },

    async onSaveNickname() {
        const { newNickname, ui: uiStrings } = this.data
        const trimmedNickname = (newNickname || '').trim()
        
        if (trimmedNickname.length === 0) {
            ui.showToast(uiStrings.nicknameEmpty)
            return
        }

        // 验证长度：中文字符计为2，英文字符计为1，总长度不能超过20 (即小于10个中文字)
        let totalLen = 0
        for (let i = 0; i < trimmedNickname.length; i++) {
            if (trimmedNickname.charCodeAt(i) > 127) {
                totalLen += 2
            } else {
                totalLen += 1
            }
        }

        if (totalLen > 20) {
            ui.showToast(uiStrings.nicknameTooLong)
            return
        }

        try {
            ui.showLoading(uiStrings.saving)
            const updateRes: any = await callApi('updateUserProfile', { nickname: trimmedNickname })

            const updatedUser = updateRes?.result?.user
            const app = getApp<IAppOption>() as any
            if (app?.globalData) app.globalData.user = updatedUser

            this.syncUserFromApp()
            this.closeNicknameModal()
            ui.hideLoading()
            ui.showSuccess(uiStrings.nicknameSuccess)
        }
        catch (err) {
            ui.hideLoading()
            ui.showError(uiStrings.updateFailed)
        }
    },

    onCancelEditNickname() {
        this.closeNicknameModal()
    },

    onRenewMember() {
        this.closeProfileSheet()
        this.openMemberHub()
    },

    onVipCardTap() {
        this.openMemberHub()
    },

    async openMemberHub() {
        this.setData({ 
            showMemberHub: true, 
            memberHubOpen: false
        })
        
        // Always fetch to ensure we have the latest scheme benefits and layout stabilizers
        await this.fetchSchemes()

        setTimeout(() => {
            this.setData({ memberHubOpen: true })
        }, 50)
    },

    async fetchSchemes() {
        try {
            const res = await callApi('getMemberSchemes', {})
            const data = (res?.result || res) as any
            if (data?.success && data?.schemes) {
                const schemes = data.schemes || []
                
                // Select first one by default if not set
                let selectedId = this.data.selectedSchemeId
                const exists = schemes.find((s:any) => s.scheme_id === selectedId)
                
                if (!exists && schemes.length > 0) {
                   selectedId = schemes[0].scheme_id
                }
                
                const selectedScheme = schemes.find((s:any) => s.scheme_id === selectedId)
                
                this.setData({ 
                    schemsList: schemes,
                    selectedSchemeId: selectedId,
                    selectedScheme
                })
                
                if (selectedId) {
                    this.calculateFinalPrice(selectedId)
                }
            }
        } catch (err) {
            console.error('Fetch schemes failed', err)
        }
    },

    onSelectScheme(e: any) {
        const id = e.currentTarget.dataset.id
        if (id === this.data.selectedSchemeId) return
        
        const scheme = this.data.schemsList.find((s: any) => s.scheme_id === id)
        this.setData({ 
            selectedSchemeId: id,
            selectedScheme: scheme,
            // isCalculatingPrice will be handled by calculateFinalPrice
        })

        // Fetch precise price from backend
        this.calculateFinalPrice(id)
    },

    async calculateFinalPrice(schemeId: number) {
        const scheme = this.data.schemsList.find((s:any) => s.scheme_id === schemeId);
        if (!scheme) return;

        // Check for Discount Condition (Upgrade)
        // Must match backend logic: Active Member + Not Topup + Higher Level
        const isMember = this.data.isMember
        const memberLevel = this.data.memberLevel
        const isUpgrade = isMember && (scheme.type !== 'topup') && (scheme.level > memberLevel)

        const shouldDelay = isUpgrade // Delay only if we expect a discount calculation

        if (shouldDelay) {
            this.setData({ isCalculatingPrice: true })
        } else {
             // If no discount expected, show standard price immediately (Prevent flicker)
             this.setData({ 
                 isCalculatingPrice: false,
                 finalPrice: scheme.price,
                 originalPrice: scheme.price,
                 isUpgradeOrder: false
             })
        }

        const startTime = Date.now()

        try {
            const res = await callApi('calculatePrice', { scheme_id: schemeId })
            const result = (res?.result || res) as any
            
            if (result.success) {
                // If we showed loading, ensure min display time
                if (shouldDelay) {
                     const elapsed = Date.now() - startTime
                     if (elapsed < 800) {
                         await new Promise(resolve => setTimeout(resolve, 800 - elapsed))
                     }
                }

                this.setData({
                    finalPrice: result.finalPrice,
                    originalPrice: result.originalPrice,
                    isUpgradeOrder: result.isUpgrade,
                    isCalculatingPrice: false
                })
            } else {
                this.setData({ isCalculatingPrice: false })
            }
        } catch (e) {
            console.error('Calculate price failed', e)
            this.setData({ isCalculatingPrice: false })
        }
    },

    async onPurchase() {
        const { selectedSchemeId, schemsList } = this.data
        if (!selectedSchemeId) return

        const scheme = schemsList.find((s: any) => s.scheme_id === selectedSchemeId)
        if (!scheme) return

        if (!this.checkPhoneBeforePayment()) return;

        // 统一调用真实的支付流程
        await this.executePaymentFlow(selectedSchemeId)
    },

    closeMemberHub() {
        this.setData({ showMemberHub: false })
    },

    onMemberHubConfirm(e: any) {
        const { complete } = e.detail;
        complete();
    },

    onRenew() {
        if (!this.checkPhoneBeforePayment()) return;

        const { memberLevel, ui: uiStrings } = this.data
        if (!memberLevel) return

        wx.showModal({
            title: uiStrings.memberRenew,
            content: uiStrings.memberRenewContent,
            confirmText: uiStrings.renewNow,
            success: (res) => {
                if (res.confirm) {
                    this.executePaymentFlow(memberLevel)
                }
            }
        })
    },

    onUpgrade() {
        if (!this.checkPhoneBeforePayment()) return;

        const { memberLevel, upgradeAmount, ui: uiStrings } = this.data
        let targetLevel = 0
        let title = ''
        let content = ''

        if (memberLevel === 1) {
            targetLevel = 2
            title = uiStrings.upgradeBasicTitle
            content = uiStrings.upgradeBasicContent.replace('{amount}', upgradeAmount.toString())
        } else if (memberLevel === 2) {
            targetLevel = 3
            title = uiStrings.upgradeProTitle
            content = uiStrings.upgradeProContent.replace('{amount}', upgradeAmount.toString())
        }

        if (!targetLevel) return

        wx.showModal({
            title,
            content,
            confirmText: uiStrings.apply,
            success: (res) => {
                if (res.confirm) {
                    this.executePaymentFlow(targetLevel, upgradeAmount)
                }
            }
        })
    },

    checkPhoneBeforePayment(): boolean {
        if (!this.data.userPhone) {
            wx.showModal({
                title: this.data.ui.phoneWarningTitle,
                content: this.data.ui.paymentPhoneRequired,
                showCancel: false,
                confirmText: this.data.ui.confirm,
                success: () => {
                    this.openProfileSheet();
                }
            });
            return false;
        }
        return true;
    },

    async executePaymentFlow(schemeId: number, amount?: number) {
        const { ui: uiStrings } = this.data
        if (!this.data.userPhone) {
            this.checkPhoneBeforePayment();
            return;
        }
        ui.showLoading(uiStrings.creatingOrder)

        try {
            const env = require('../../env.js')
            const mchId = env.mchId || env.default?.mchId
            
            if (!mchId) {
                throw new Error(uiStrings.mchIdMissing)
            }

            // 1. 创建订单并获取统一下单参数
            const orderRes = await callApi('createOrder', {
                scheme_id: schemeId,
                amount: amount, // 如果是升级，传补差价金额
                mchId: mchId
            })

            const orderResult = orderRes.result || (orderRes as any)
            console.log('[Payment] createOrder response:', orderResult)

            if (!orderResult?.success) {
                throw new Error(orderResult?.message || uiStrings.orderCreateFailed)
            }

            const { payment, order_id } = orderResult
            
            if (!payment || !payment.paySign) {
                console.error('[Payment] Missing payment parameters:', payment)
                throw new Error(uiStrings.payParamMissing)
            }

            ui.hideLoading()

            // 2. 发起微信支付
            await new Promise((resolve, reject) => {
                wx.requestPayment({
                    timeStamp: payment.timeStamp,
                    nonceStr: payment.nonceStr,
                    package: payment.package,
                    signType: payment.signType,
                    paySign: payment.paySign,
                    success: resolve,
                    fail: (err) => {
                        console.error('[Payment] wx.requestPayment fail:', err)
                        reject(err)
                    }
                })
            })

            ui.showLoading(uiStrings.activatingMember)

            // 3. 更新订单状态
            await callApi('updateOrderStatus', {
                order_id,
                status: '已支付'
            })

            // 4. 激活会员权益
            const activateRes = await callApi('activateMembership', {
                order_id
            })

            const activateResult = activateRes.result || (activateRes as any)
            if (!activateResult?.success) {
                throw new Error(activateResult?.message || uiStrings.activateMemberFailed)
            }

            // 5. 刷新用户信息
            const app = getApp<IAppOption>() as any
            app.globalData.user = activateResult.user
            this.syncUserFromApp()

            ui.hideLoading()
            ui.showSuccess(uiStrings.paySuccess)

            // 如果是在会员中心操作，支付成功后关闭
            this.closeMemberHub()
        } catch (err: any) {
            ui.hideLoading()
            console.error('[Payment] Error:', err)
            
            if (err.errMsg && (err.errMsg.includes('requestPayment:fail cancel') || err.errMsg.includes('cancel'))) {
                // 温和提示用户再次重试，且不关闭弹窗
                ui.showToast(this.data.appLanguage.includes('Chinese') ? '支付已取消，如有需要请再次重试' : 'Payment cancelled. Please try again if needed.')
                return
            }

            wx.showModal({
                title: uiStrings.payPrompt,
                content: (err.message || err.errMsg || uiStrings.payError) + (err.order_id ? ` (ID: ${err.order_id})` : ''),
                showCancel: false,
                confirmText: uiStrings.confirm
            })
        }
    },

    formatExpiredDate(expired: any): string {
        const { ui: uiStrings } = this.data
        if (!expired) return uiStrings.notActivated
        const ms = toDateMs(expired)
        if (!ms) return uiStrings.notActivated
        const date = new Date(ms)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    },

    formatPhoneNumber(phone: string | null | undefined): string {
        const { ui: uiStrings } = this.data
        if (!phone || phone.length < 7) return uiStrings.notBound
        // 前3位+****+后4位
        const prefix = phone.substring(0, 3)
        const suffix = phone.substring(phone.length - 4)
        return `${prefix}****${suffix}`
    },

    async onChangePhoneNumber(e: any) {
        const { ui: uiStrings } = this.data
        if ((this.data as any).phoneAuthBusy) return

        if (e?.detail?.errMsg && e.detail.errMsg.includes('cancel')) {
            return
        }

        this.setData({ phoneAuthBusy: true })
        try {
            const phone = await getPhoneNumberFromAuth(e.detail)
            if (!phone) {
                throw new Error(uiStrings.phoneAuthFailed)
            }

            // 如果是首次设置手机号，弹出重要提示
            if (!this.data.userPhone) {
                wx.showModal({
                    title: this.data.ui.phoneWarningTitle,
                    content: this.data.ui.phoneWarningContent,
                    confirmText: this.data.ui.phoneWarningConfirm,
                    showCancel: true,
                    success: async (res) => {
                        if (res.confirm) {
                            try {
                                await updatePhoneNumber(phone)
                                this.syncUserFromApp()
                                ui.showToast(uiStrings.phoneUpdateSuccess)
                            } catch (err: any) {
                                this.handlePhoneUpdateError(err)
                            } finally {
                                this.setData({ phoneAuthBusy: false })
                            }
                        } else {
                            this.setData({ phoneAuthBusy: false })
                        }
                    },
                    fail: () => {
                        this.setData({ phoneAuthBusy: false })
                    }
                })
            } else {
                // 如果已经有手机号（理论上按钮已隐藏，但为保险起见保留逻辑）
                await updatePhoneNumber(phone)
                this.syncUserFromApp()
                ui.showToast(uiStrings.phoneUpdateSuccess)
                this.setData({ phoneAuthBusy: false })
            }
        }
        catch (err: any) {
            this.handlePhoneUpdateError(err)
            this.setData({ phoneAuthBusy: false })
        }
    },

    handlePhoneUpdateError(err: any) {
        const { ui: uiStrings } = this.data
        console.error('[PhoneAuth] phone update error:', err)
        const errorMsg = err?.message || err?.errMsg || uiStrings.phoneUpdateFailed
        ui.showToast(errorMsg.length > 10 ? uiStrings.phoneUpdateFailed : errorMsg)
    },

    onResumeProfileTap() {
        wx.navigateTo({
            url: '/pages/resume-profile/index',
        })
    },

    onGeneratedResumesTap() {
        wx.navigateTo({
            url: '/pages/generated-resumes/index',
        })
    },
})
