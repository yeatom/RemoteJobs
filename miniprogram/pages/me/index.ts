// miniprogram/pages/me/index.ts

import { isAiChineseUnlocked } from '../../utils/subscription'
import type { ResolvedSavedJob } from '../../utils/job'
import { mapJobs, typeCollectionMap } from '../../utils/job'
import { normalizeLanguage, t, type AppLanguage } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'

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
    currentLanguage: '中文',
    isAiChineseUnlocked: false,
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
      },
    })
  },

  onUnload() {
    const fn = (this as any)._langDetach
    if (typeof fn === 'function') fn()
    ;(this as any)._langDetach = null
  },

  onShow() {

    this.syncUserFromApp()
    this.syncLanguageFromApp()
  },

  syncUserFromApp() {
    const app = getApp<IAppOption>() as any
    const user = app?.globalData?.user

    const isLoggedIn = !!(user && (user.isAuthed || user.phone))

    const hasCloudProfile = user && typeof user.avatar === 'string' && typeof user.nickname === 'string' && user.avatar && user.nickname
    const userInfo = hasCloudProfile
      ? ({ avatarUrl: user.avatar, nickName: user.nickname } as WechatMiniprogram.UserInfo)
      : null

    const isAiUnlocked = isAiChineseUnlocked(user)

    this.setData({ isLoggedIn, userInfo, isAiChineseUnlocked: isAiUnlocked })
  },

  syncLanguageFromApp() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)

    const ui = {
      meTitle: t('me.title', lang),
      userNotLoggedIn: t('me.userNotLoggedIn', lang),
      favoritesEntry: t('me.favoritesEntry', lang),
      languageEntry: t('me.languageEntry', lang),
      emptyFavorites: t('me.emptyFavorites', lang),
      comingSoon: t('me.comingSoon', lang),
      langChinese: t('me.langChinese', lang),
      langEnglish: t('me.langEnglish', lang),
      langAIChinese: t('me.langAIChinese', lang),
    }

    this.setData({
      currentLanguage: lang === 'English' ? 'English' : lang === 'AIChinese' ? 'AIChinese' : '中文',
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
      console.error('[me] realtime phone auth failed', err)
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
      console.error('[me] phone auth failed', err)
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

      const collectedRes = await db
        .collection('collected_jobs')
        .where({ openid })
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get()

      const collected = (collectedRes.data || []) as any[]
      if (collected.length === 0) {
        this.setData({ savedJobs: [] })
        return
      }

      const groups = new Map<string, string[]>()
      for (const row of collected) {
        const t = row?.type
        const id = row?.jobId
        if (!t || !id) continue
        const list = groups.get(t) || []
        list.push(id)
        groups.set(t, list)
      }

      const jobByKey = new Map<string, any>()
      const fetchGroup = async (type: string, ids: string[]) => {
        const collectionName = typeCollectionMap[type]
        if (!collectionName) return

        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const res = await db.collection(collectionName).doc(id).get()
              return { id, collectionName, data: res.data }
            } catch {
              return null
            }
          })
        )

        for (const r of results) {
          if (!r?.data) continue
          jobByKey.set(`${type}:${r.id}`, { ...r.data, _id: r.id, sourceCollection: r.collectionName })
        }
      }

      await Promise.all(Array.from(groups.entries()).map(([type, ids]) => fetchGroup(type, ids)))

      const merged: ResolvedSavedJob[] = []
      for (const row of collected) {
        const type = row?.type
        const jobId = row?.jobId
        if (!type || !jobId) continue

        const key = `${type}:${jobId}`
        const job = jobByKey.get(key)
        if (!job) continue

        merged.push({
          ...(job as any),
          jobId,
          sourceCollection: job.sourceCollection,
        })
      }

      // normalize tags/displayTags
      const normalized = mapJobs(merged) as any
      this.setData({ savedJobs: normalized })
    } catch (err) {
      console.error('[me] loadSavedJobs failed', err)
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
    const jobId = (job?.jobId || job?._id || e?.currentTarget?.dataset?._id) as string
    const collection = (job?.sourceCollection || e?.currentTarget?.dataset?.collection || '') as string

    if (!jobId || !collection) {
      wx.showToast({ title: '无法打开详情', icon: 'none' })
      return
    }

    // Keep favorites sheet open; just show detail over it.
    this.setData({
      selectedJobId: jobId,
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

    const lang: AppLanguage = value === 'English' ? 'English' : value === 'AIChinese' ? 'AIChinese' : 'Chinese'

    const app = getApp<IAppOption>() as any
    const user = app?.globalData?.user

    // Gate AI Chinese behind subscription
    if (lang === 'AIChinese' && !isAiChineseUnlocked(user)) {
      this.closeLanguageSheetImmediate()

      wx.showModal({
        title: 'AI全中文 🔒',
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
    } catch (err) {
      console.warn('[me] setLanguage failed, keep loading until settled', err)
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
})
