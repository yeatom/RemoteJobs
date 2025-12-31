// miniprogram/pages/me/index.ts

import { isAiChineseUnlocked } from '../../utils/subscription'
import type { ResolvedSavedJob } from '../../utils/job'
import { mapJobs, getJobFieldsByLanguage, mapJobFieldsToStandard } from '../../utils/job'
import { normalizeLanguage, t, type AppLanguage } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'
import { toDateMs } from '../../utils/time'

Page({
  data: {
    userInfo: null as WechatMiniprogram.UserInfo | null,
    isLoggedIn: false,
    phoneAuthBusy: false,

    showSavedSheet: false,
    savedSheetOpen: false,
    savedLoading: false,
    savedJobs: [] as ResolvedSavedJob[],

    showJobDetail: false,
    selectedJobId: '',
    selectedCollection: '',

    showLanguageSheet: false,
    languageSheetOpen: false,
    currentLanguage: 'Chinese',
    isAiChineseUnlocked: false,

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
        const app = getApp<IAppOption>() as any
        const lang = normalizeLanguage(app?.globalData?.language)
        wx.setNavigationBarTitle({ title: t('app.navTitle', lang) })
        
        // 如果收藏列表是打开的，重新加载收藏数据
        if (this.data.showSavedSheet && this.data.savedSheetOpen) {
          this.loadSavedJobs()
        }
      },
    })
  },

  onUnload() {
    const fn = (this as any)._langDetach
    if (typeof fn === 'function') fn()
    ;(this as any)._langDetach = null
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

    this.setData({ isLoggedIn, isVerified, isMember, userInfo, isAiChineseUnlocked: isAiUnlocked, myInviteCode, expiredDate, expiredDateText })
  },

  syncLanguageFromApp() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)

    const ui = {
      meTitle: t('me.title', lang),
      userNotLoggedIn: t('me.userNotLoggedIn', lang),
      favoritesEntry: t('me.favoritesEntry', lang),
      generateResumeEntry: t('me.generateResumeEntry', lang),
      publishSkillEntry: t('me.publishSkillEntry', lang),
      aiTranslateEntry: t('me.aiTranslateEntry', lang),
      inviteCodeEntry: t('me.inviteCodeEntry', lang),
      myInviteCode: t('me.myInviteCode', lang),
      inputInviteCode: t('me.inputInviteCode', lang),
      inviteCodeCopied: t('me.inviteCodeCopied', lang),
      inviteCodeInvalid: t('me.inviteCodeInvalid', lang),
      inviteCodeApplied: t('me.inviteCodeApplied', lang),
      emptyFavorites: t('me.emptyFavorites', lang),
      comingSoon: t('me.comingSoon', lang),
      langDefault: t('me.langDefault', lang),
      langEnglish: t('me.langEnglish', lang),
      langAIChinese: t('me.langAIChinese', lang),
      langAIEnglish: t('me.langAIEnglish', lang),
      memberBadge: t('me.memberBadge', lang),
      uploadAvatar: t('me.uploadAvatar', lang),
      editNickname: t('me.editNickname', lang),
      memberExpiredDate: t('me.memberExpiredDate', lang),
    }

    // Chinese 表示中文（使用原始字段）
    // English 表示英文
    // AIChinese 表示AI翻译岗位-中文（使用翻译字段）
    // AIEnglish 表示AI翻译岗位-英文（使用翻译字段）
    this.setData({
      currentLanguage: lang === 'AIChinese' ? 'AIChinese' :
                      lang === 'AIEnglish' ? 'AIEnglish' :
                      lang === 'English' ? 'English' :
                      'Chinese',  // 默认显示为中文选项
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
    } catch (err) {
      wx.showToast({ title: '手机号授权失败', icon: 'none' })
    } finally {
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
    } catch (err) {
      wx.showToast({ title: '手机号授权失败', icon: 'none' })
    } finally {
      this.setData({ phoneAuthBusy: false })
    }
  },

  onOpenSaved() {
    if (!(this.data as any).isLoggedIn) {
      wx.showToast({ title: '请先授权手机号', icon: 'none' })
      return
    }

    this.openSavedSheet()
  },

  openSavedSheet() {
    // Mount first, then open on next tick to trigger CSS transition.
    this.setData({ showSavedSheet: true, savedSheetOpen: false })

    setTimeout(() => {
      this.setData({ savedSheetOpen: true })
    }, 30)

    this.loadSavedJobs()
  },

  closeSavedSheet() {
    this.setData({ savedSheetOpen: false })

    setTimeout(() => {
      this.setData({ showSavedSheet: false })
    }, 260)
  },

  async loadSavedJobs() {
    const app = getApp<IAppOption>() as any
    const user = app?.globalData?.user
    const openid = user?.openid
    const isLoggedIn = !!(user && (user.isAuthed || user.phone))
    if (!isLoggedIn || !openid) {
      this.setData({ savedJobs: [] })
      return
    }

    this.setData({ savedLoading: true })
    try {
      const db = wx.cloud.database()

      const savedRes = await db
        .collection('saved_jobs')
        .where({ openid })
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get()

      const savedRecords = (savedRes.data || []) as any[]
      if (savedRecords.length === 0) {
        this.setData({ savedJobs: [] })
        return
      }

      // 获取所有收藏的 jobId
      const jobIds = savedRecords.map(row => row?.jobId).filter(Boolean) as string[]
      
      if (jobIds.length === 0) {
        this.setData({ savedJobs: [] })
        return
      }

      // 获取用户语言设置并确定字段名
      const app = getApp<IAppOption>() as any
      const userLanguage = normalizeLanguage(app?.globalData?.language || 'Chinese')
      const { titleField, summaryField, descriptionField, salaryField, sourceNameField } = getJobFieldsByLanguage(userLanguage)

      // 从 remote_jobs collection 查询所有收藏的职位
      const results = await Promise.all(
        jobIds.map(async (id) => {
            try {
              let query: any = db.collection('remote_jobs').doc(id)
              
              // 根据语言选择字段，只查询需要的字段
              const fieldSelection: any = {
                _id: true,
                createdAt: true,
                source_url: true,
                team: true,
                type: true,
                tags: true,
                [titleField]: true,
                [summaryField]: true,
                [descriptionField]: true,
              }
              
              // 根据语言选择 salary 和 source_name 字段
              if (salaryField) {
                fieldSelection[salaryField] = true
                if (userLanguage === 'AIEnglish' && salaryField !== 'salary') {
                  fieldSelection.salary = true
                }
              } else {
                fieldSelection.salary = true
              }
              
              if (sourceNameField) {
                fieldSelection[sourceNameField] = true
                if (userLanguage === 'AIEnglish' && sourceNameField !== 'source_name') {
                  fieldSelection.source_name = true
                }
              } else {
                fieldSelection.source_name = true
              }
              
              query = query.field(fieldSelection)
              
            const res = await query.get()
            let jobData = res.data
            
            // 将查询的字段名映射回标准字段名
            if (jobData) {
              jobData = mapJobFieldsToStandard(jobData, titleField, summaryField, descriptionField, salaryField, sourceNameField)
            }
            
            return { id, data: jobData }
          } catch {
            return null
          }
        })
      )

      const jobByKey = new Map<string, any>()
      for (const r of results) {
        if (!r?.data) continue
        jobByKey.set(r.id, { ...r.data, _id: r.id })
      }

      // 按照 savedRecords 的顺序合并数据
      const merged: ResolvedSavedJob[] = []
      for (const row of savedRecords) {
        const _id = row?.jobId // 从 saved_jobs 集合读取的 jobId 字段（实际是岗位的 _id）
        if (!_id) continue

        const job = jobByKey.get(_id)
        if (!job) continue

        merged.push({
          ...(job as any),
          _id,
          sourceCollection: 'remote_jobs',
        })
      }

      // normalize tags/displayTags
      const normalized = mapJobs(merged, userLanguage) as any
      this.setData({ savedJobs: normalized })
    } catch (err) {
      wx.showToast({ title: '加载收藏失败', icon: 'none' })
    } finally {
      this.setData({ savedLoading: false })
    }
  },

  closeJobDetail() {
    this.setData({ showJobDetail: false })
  },

  onSavedJobTap(e: any) {
    const job = e?.detail?.job
    const _id = (job?._id || e?.currentTarget?.dataset?._id) as string
    // 统一使用 remote_jobs collection
    const collection = 'remote_jobs'

    if (!_id) {
      wx.showToast({ title: '无法打开详情', icon: 'none' })
      return
    }

    // Keep favorites sheet open; just show detail over it.
    this.setData({
      selectedJobId: _id,
      selectedCollection: collection,
      showJobDetail: true,
    })
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

    // 中文选项（value='Chinese'）→ 设置为 'Chinese'（使用 title 等原始字段）
    // 英文选项（value='English'）→ 设置为 'English'
    // AI翻译岗位-中文选项（value='AIChinese'）→ 设置为 'AIChinese'（使用 title_chinese 等翻译字段）
    // AI翻译岗位-英文选项（value='AIEnglish'）→ 设置为 'AIEnglish'（使用 title_english 等翻译字段）
    const lang: AppLanguage = value === 'AIChinese' ? 'AIChinese' :
                             value === 'AIEnglish' ? 'AIEnglish' :
                             value === 'English' ? 'English' :
                             'Chinese'  // 默认使用原始字段
    const app = getApp<IAppOption>() as any

    // Check if AI features are unlocked
    if ((value === 'AIChinese' || value === 'AIEnglish') && !this.data.isAiChineseUnlocked) {
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
    } catch (err) {
      try {
        await action
      } finally {
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
      } else {
        // Generate invite code if not exists
        const result = await wx.cloud.callFunction({
          name: 'generateInviteCode',
          data: {}
        })

        if (result.result?.inviteCode) {
          this.setData({ myInviteCode: result.result.inviteCode })
          // Update global user data
          if (app?.globalData?.user) {
            app.globalData.user.inviteCode = result.result.inviteCode
          }
        }
      }
    } catch (err) {
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

      if (result.result?.success) {
        wx.showToast({ title: ui.inviteCodeApplied, icon: 'success' })
        this.setData({ inputInviteCode: '' })
        this.closeInviteSheet()
      } else {
        wx.showToast({ title: result.result?.message || '应用失败', icon: 'none' })
      }
    } catch (err) {
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
    } catch (err: any) {
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
    } catch (err) {
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
