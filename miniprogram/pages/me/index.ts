// miniprogram/pages/me/index.ts

import {isAiChineseUnlocked} from '../../utils/subscription'
import {normalizeLanguage, t, type AppLanguage} from '../../utils/i18n'
import {attachLanguageAware} from '../../utils/languageAware'
import {toDateMs} from '../../utils/time'
import {getPhoneNumberFromAuth, updatePhoneNumber} from '../../utils/phoneAuth'


Page({
    data: {
        userInfo: null as WechatMiniprogram.UserInfo | null,
        isInitialLoading: true,
        phoneAuthBusy: false,


        showLanguageSheet: false,
        languageSheetOpen: false,
        appLanguage: 'Chinese' as AppLanguage,
        isAiChineseUnlocked: false,

        showInviteSheet: false,
        inviteSheetOpen: false,
        myInviteCode: '',
        inputInviteCode: '',

        isVerified: false, // User verification status
        isMember: false, // Member status based on expiredDate
        expiredDate: null as any, // Member expired date
        expiredDateText: '', // Formatted expired date text
        memberLevel: 0, // 0:普通用户, 1:3天会员, 2:普通月卡, 3:高级月卡
        memberBadgeText: '', // 会员徽章文本（从数据库查询）
        memberExpiryText: '', // 会员到期时间文案

        // Quota info
        jobQuotaUsed: 0,
        jobQuotaLimit: 0,
        jobQuotaProgress: 0,
        
        // Upgrade info
        upgradeAmount: 0, // 补差价金额
        isQuotaExhausted: false, // 额度是否耗尽

        showMemberHub: false,
        memberHubOpen: false,

        showProfileSheet: false,
        profileSheetOpen: false,
        showNicknameModal: false,
        nicknameModalOpen: false,
        newNickname: '',
        maskedPhone: '', // 脱敏后的手机号

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
        this.initPage()
    },

    async initPage() {
        const app = getApp<IAppOption>()
        if (app.globalData.userPromise) {
            await app.globalData.userPromise
        }
        
        this.setData({ isInitialLoading: false })
        
        // Use setTimeout to defer heavy operations and avoid blocking UI
        setTimeout(() => {
            this.syncUserFromApp()
            this.syncLanguageFromApp()
            // loadMemberBadgeText 会在 syncUserFromApp 和 syncLanguageFromApp 中调用
        }, 0)
    },

    syncUserFromApp() {
        const app = getApp<IAppOption>() as any
        const user = app?.globalData?.user

        const isVerified = !!(user && (user.isAuthed || user.phone)) // 认证状态：有手机号或已认证

        // 使用新包裹字段 membership
        const membership = user?.membership
        const memberLevel = membership?.level || 0
        const memberExpireAt = membership?.expire_at
        
        // 判断是否是有效会员：memberLevel > 0 且未过期
        let isMember = false
        let expiredDate = null
        if (memberLevel > 0 && memberExpireAt) {
            const ms = toDateMs(memberExpireAt)
            if (ms && ms > Date.now()) {
                isMember = true
                expiredDate = memberExpireAt
            }
        }

        const userInfo = user && user.avatar && user.nickname
            ? ({ avatarUrl: user.avatar, nickName: user.nickname } as WechatMiniprogram.UserInfo)
            : null

        const isAiUnlocked = isAiChineseUnlocked(user)

        // Sync invite code if available
        const myInviteCode = user?.inviteCode || ''

        // Sync expired date
        const expiredDateText = this.formatExpiredDate(expiredDate)
        const memberExpiryText = isMember ? `${t('me.memberExpiredDate', normalizeLanguage(app?.globalData?.language))}: ${expiredDateText}` : ''

        // Format phone number (前3位+****+后4位)
        const maskedPhone = this.formatPhoneNumber(user?.phone)

        // Quota logic
        const jobQuotaUsed = membership?.job_quota?.used || 0
        const jobQuotaLimit = membership?.job_quota?.limit || 0
        const jobQuotaProgress = jobQuotaLimit > 0 ? Math.min(100, (jobQuotaUsed / jobQuotaLimit) * 100) : 0
        const isQuotaExhausted = jobQuotaLimit > 0 && jobQuotaUsed >= jobQuotaLimit

        this.setData({
            isVerified,
            isMember,
            memberLevel,
            userInfo,
            isAiChineseUnlocked: isAiUnlocked,
            myInviteCode,
            expiredDate,
            expiredDateText,
            memberExpiryText,
            maskedPhone,
            jobQuotaUsed,
            jobQuotaLimit,
            jobQuotaProgress,
            isQuotaExhausted
        })

        // 加载会员徽章及差价逻辑
        this.loadMemberBadgeText(memberLevel)
    },

    syncLanguageFromApp() {
        const app = getApp<IAppOption>() as any
        const lang = normalizeLanguage(app?.globalData?.language)

        const ui = {
            meTitle: t('me.title', lang),
            generateResumeEntry: t('me.generateResumeEntry', lang),
            publishSkillEntry: t('me.publishSkillEntry', lang),
            languageEntry: t('me.languageEntry', lang),
            langChinese: t('me.langChinese', lang),
            langChineseDesc: t('me.langChineseDesc', lang),
            langEnglish: t('me.langEnglish', lang),
            langEnglishDesc: t('me.langEnglishDesc', lang),
            langAIChinese: t('me.langAIChinese', lang),
            langAIChineseDesc: t('me.langAIChineseDesc', lang),
            langAIEnglish: t('me.langAIEnglish', lang),
            langAIEnglishDesc: t('me.langAIEnglishDesc', lang),
            inviteCodeEntry: t('me.inviteCodeEntry', lang),
            myInviteCode: t('me.myInviteCode', lang),
            inputInviteCode: t('me.inputInviteCode', lang),
            inviteCodeCopied: t('me.inviteCodeCopied', lang),
            inviteCodeInvalid: t('me.inviteCodeInvalid', lang),
            inviteCodeApplied: t('me.inviteCodeApplied', lang),
            comingSoon: t('me.comingSoon', lang),
            memberBadge: t('me.memberBadge', lang),
            uploadAvatar: t('me.uploadAvatar', lang),
            editNickname: t('me.editNickname', lang),
            memberExpiredDate: t('me.memberExpiredDate', lang),
            phoneNumber: t('me.phoneNumber', lang),
            changePhone: t('me.changePhone', lang),
            nicknameTooLong: t('me.nicknameTooLong', lang),
            resumeProfileEntry: t('me.resumeProfileEntry', lang),
            appliedJobsEntry: t('me.appliedJobsEntry', lang),
            generatedResumesEntry: t('me.generatedResumesEntry', lang),
            save: lang === 'Chinese' || lang === 'AIChinese' ? '保存' : 'Save',
            cancel: lang === 'Chinese' || lang === 'AIChinese' ? '取消' : 'Cancel',
        }

        this.setData({
            appLanguage: lang,
            ui,
        })

        // intentionally do not set navigationBarTitleText
        
        // 语言切换时重新加载徽章文本
        const currentMemberLevel = (this.data as any).memberLevel || 0
        this.loadMemberBadgeText(currentMemberLevel)
    },

    async loadMemberBadgeText(memberLevel?: number) {
        // 如果没有传入 memberLevel，则从 data 或 user 中获取
        if (memberLevel === undefined) {
            const app = getApp<IAppOption>() as any
            const user = app?.globalData?.user
            memberLevel = (this.data as any).memberLevel || user?.membership?.level || 0
        }

        // 如果不是会员，不显示徽章
        if (memberLevel === 0) {
            this.setData({ memberBadgeText: '' })
            return
        }

        try {
            // 获取会员方案列表
            const res: any = await wx.cloud.callFunction({
                name: 'getMemberSchemes',
                data: {},
            })

            if (res?.result?.success && res.result.schemes) {
                const schemes = res.result.schemes
                // 根据 memberLevel 找到对应的方案
                const scheme = schemes.find((s: any) => s.scheme_id === memberLevel)
                if (scheme && scheme.displayName) {
                    this.setData({ memberBadgeText: scheme.displayName })
                } else {
                    console.warn('未找到对应的会员方案，memberLevel:', memberLevel, 'schemes:', schemes)
                    this.setData({ memberBadgeText: '' })
                }

                // 计算升级差价
                if (memberLevel === 1) {
                    const level2Scheme = schemes.find((s: any) => s.scheme_id === 2)
                    if (level2Scheme && scheme) {
                        const diff = (level2Scheme.price || 0) - (scheme.price || 0)
                        this.setData({ upgradeAmount: diff > 0 ? diff : 0 })
                    }
                } else if (memberLevel === 2) {
                    const level3Scheme = schemes.find((s: any) => s.scheme_id === 3)
                    if (level3Scheme && scheme) {
                        const diff = (level3Scheme.price || 0) - (scheme.price || 0)
                        this.setData({ upgradeAmount: diff > 0 ? diff : 0 })
                    }
                }
            } else {
                console.warn('获取会员方案失败:', res?.result)
                this.setData({ memberBadgeText: '' })
            }
        } catch (err) {
            console.error('加载会员徽章文本失败:', err)
            this.setData({ memberBadgeText: '' })
        }
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
        const lang = (e.currentTarget.dataset.value || '') as AppLanguage
        if (!lang) return

        const app = getApp<IAppOption>() as any

        // 如果选择的语言和当前语言相同，只关闭弹窗，不做任何操作
        const currentLang = normalizeLanguage(app?.globalData?.language)
        if (currentLang === lang) {
            this.closeLanguageSheetImmediate()
            return
        }

        // Check if AI features are unlocked
        if (lang.startsWith('AI') && !this.data.isAiChineseUnlocked) {
            this.closeLanguageSheetImmediate()
            wx.showModal({
                title: 'AI翻译与提炼 🔒',
                content: '开启 AI 增强模式需要付费解锁。',
                confirmText: '去支付',
                cancelText: '取消',
                success: (res) => {
                    if (res.confirm) {
                        this.openMemberHub()
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

    onLanguageTap() {
        this.openLanguageSheet()
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
        })

        setTimeout(() => {
            this.setData({ profileSheetOpen: true })
        }, 30)
    },

    closeProfileSheet() {
        this.setData({ profileSheetOpen: false })
        setTimeout(() => {
            this.setData({ showProfileSheet: false, newNickname: '' })
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
        }, 260)
    },

    onNicknameInput(e: any) {
        this.setData({ newNickname: e.detail.value })
    },

    async onSaveNickname() {
        const { newNickname, ui } = this.data
        const trimmedNickname = (newNickname || '').trim()
        
        if (trimmedNickname.length === 0) {
            wx.showToast({ title: '用户名不能为空', icon: 'none' })
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
            wx.showToast({ title: ui.nicknameTooLong, icon: 'none' })
            return
        }

        try {
            wx.showLoading({ title: '保存中...', mask: true })
            const updateRes: any = await wx.cloud.callFunction({
                name: 'updateUserProfile',
                data: { nickname: trimmedNickname },
            })

            const updatedUser = updateRes?.result?.user
            const app = getApp<IAppOption>() as any
            if (app?.globalData) app.globalData.user = updatedUser

            this.syncUserFromApp()
            this.closeNicknameModal()
            wx.hideLoading()
            wx.showToast({ title: '用户名更新成功', icon: 'success' })
        }
        catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '更新失败', icon: 'none' })
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

    openMemberHub() {
        this.setData({ showMemberHub: true, memberHubOpen: false })
        setTimeout(() => {
            this.setData({ memberHubOpen: true })
        }, 30)
    },

    closeMemberHub() {
        this.setData({ memberHubOpen: false })
        setTimeout(() => {
            this.setData({ showMemberHub: false })
        }, 260)
    },

    closeMemberHubImmediate() {
        this.setData({ memberHubOpen: false })
        setTimeout(() => {
            this.setData({ showMemberHub: false })
        }, 260)
    },

    onRenew() {
        const { memberLevel, memberBadgeText } = this.data
        if (!memberLevel) return

        wx.showModal({
            title: '会员续费',
            content: `即将为您办理 ${memberBadgeText} 的续费手续。`,
            confirmText: '立即续费',
            success: (res) => {
                if (res.confirm) {
                    this.executePaymentFlow(memberLevel)
                }
            }
        })
    },

    onUpgrade() {
        const { memberLevel, upgradeAmount } = this.data
        let targetLevel = 0
        let title = ''
        let content = ''

        if (memberLevel === 1) {
            targetLevel = 2
            title = '升级普通会员'
            content = `补差价 ¥${upgradeAmount} 即可升级为普通会员，享受更多岗位配额及 AI 提炼次数。`
        } else if (memberLevel === 2) {
            targetLevel = 3
            title = '升级高级会员'
            content = `补差价 ¥${upgradeAmount} 即可升级为高级会员，尊享无限次 AI 提炼及专属视觉效果。`
        }

        if (!targetLevel) return

        wx.showModal({
            title,
            content,
            confirmText: '立即升级',
            success: (res) => {
                if (res.confirm) {
                    this.executePaymentFlow(targetLevel, upgradeAmount)
                }
            }
        })
    },

    async executePaymentFlow(schemeId: number, amount?: number) {
        wx.showLoading({ title: '正在创建订单...', mask: true })

        try {
            const env = require('../../env.js')
            const mchId = env.mchId || env.default?.mchId
            const envId = env.cloudEnv || env.default?.cloudEnv
            
            if (!mchId) {
                throw new Error('未能在 env.js 中找到商户号 mchId')
            }

            // 1. 创建订单并获取统一下单参数
            const orderRes: any = await wx.cloud.callFunction({
                name: 'createOrder',
                data: {
                    scheme_id: schemeId,
                    amount: amount, // 如果是升级，传补差价金额
                    mchId: mchId,
                    envId: envId
                }
            })

            console.log('[Payment] createOrder response:', orderRes.result)

            if (!orderRes.result?.success) {
                throw new Error(orderRes.result?.message || '订单创建失败')
            }

            const { payment, order_id } = orderRes.result
            
            if (!payment || !payment.paySign) {
                console.error('[Payment] Missing payment parameters:', payment)
                throw new Error('支付参数缺失，请检查云开发后台微信支付配置')
            }

            wx.hideLoading()

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

            wx.showLoading({ title: '正在激活会员...', mask: true })

            // 3. 更新订单状态
            await wx.cloud.callFunction({
                name: 'updateOrderStatus',
                data: {
                    order_id,
                    status: '已支付'
                }
            })

            // 4. 激活会员权益
            const activateRes: any = await wx.cloud.callFunction({
                name: 'activateMembership',
                data: {
                    order_id
                }
            })

            if (!activateRes.result?.success) {
                throw new Error(activateRes.result?.message || '激活会员失败')
            }

            // 5. 刷新用户信息
            const app = getApp<IAppOption>() as any
            app.globalData.user = activateRes.result.user
            this.syncUserFromApp()

            wx.hideLoading()
            wx.showToast({
                title: '支付成功',
                icon: 'success',
                duration: 2000
            })

            // 如果是在会员中心操作，支付成功后关闭
            this.closeMemberHub()
        } catch (err: any) {
            wx.hideLoading()
            console.error('[Payment] Error:', err)
            
            if (err.errMsg && err.errMsg.includes('requestPayment:fail cancel')) {
                wx.showToast({ title: '支付已取消', icon: 'none' })
                return
            }

            wx.showModal({
                title: '支付提示',
                content: err.message || '支付过程出现问题，请稍后再试',
                showCancel: false
            })
        }
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

    formatPhoneNumber(phone: string | null | undefined): string {
        if (!phone || phone.length < 7) return '未绑定'
        // 前3位+****+后4位
        const prefix = phone.substring(0, 3)
        const suffix = phone.substring(phone.length - 4)
        return `${prefix}****${suffix}`
    },

    async onChangePhoneNumber(e: any) {
        if ((this.data as any).phoneAuthBusy) return

        if (e?.detail?.errMsg && e.detail.errMsg.includes('cancel')) {
            return
        }

        this.setData({ phoneAuthBusy: true })
        try {
            const phone = await getPhoneNumberFromAuth(e.detail)
            if (!phone) {
                throw new Error('未获取到手机号')
            }

            await updatePhoneNumber(phone)
            this.syncUserFromApp()
            wx.showToast({ title: '手机号更新成功', icon: 'success' })
        }
        catch (err: any) {
            console.error('[PhoneAuth] onChangePhoneNumber error:', err)
            const errorMsg = err?.message || err?.errMsg || '手机号更新失败'
            wx.showToast({ 
                title: errorMsg.length > 10 ? '手机号更新失败' : errorMsg, 
                icon: 'none',
                duration: 2000
            })
        }
        finally {
            this.setData({ phoneAuthBusy: false })
        }
    },

    onResumeProfileTap() {
        wx.navigateTo({
            url: '/pages/resume-profile/index',
        })
    },

    onAppliedJobsTap() {
        wx.navigateTo({
            url: '/pages/applied-jobs/index',
        })
    },

    onGeneratedResumesTap() {
        wx.navigateTo({
            url: '/pages/generated-resumes/index',
        })
    },
})
