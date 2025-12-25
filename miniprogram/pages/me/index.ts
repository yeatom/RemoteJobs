// miniprogram/pages/me/index.ts

import type { ResolvedFavoriteJob } from '../../utils/job'
import { mapJobs, typeCollectionMap } from '../../utils/job'

Page({
  data: {
    userInfo: null as WechatMiniprogram.UserInfo | null,
    isLoggedIn: false,
    phoneAuthBusy: false,

    showFavoritesSheet: false,
    favoritesSheetOpen: false,
    favoritesLoading: false,
    favoritesJobs: [] as ResolvedFavoriteJob[],

    showJobDetail: false,
    selectedJobId: '',
    selectedCollection: '',

    showLanguageSheet: false,
    languageSheetOpen: false,
    currentLanguage: '中文',
  },

  onShow() {
    this.syncUserFromApp()
  },

  syncUserFromApp() {
    const app = getApp<IAppOption>() as any
    const user = app?.globalData?.user
    const isLoggedIn = !!(user && (user.isAuthed || user.phone))

    const hasCloudProfile = user && typeof user.avatar === 'string' && typeof user.nickname === 'string' && user.avatar && user.nickname
    const userInfo = hasCloudProfile
      ? ({ avatarUrl: user.avatar, nickName: user.nickname } as WechatMiniprogram.UserInfo)
      : null

    this.setData({ isLoggedIn, userInfo })
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

  onOpenFavorites() {
    if (!(this.data as any).isLoggedIn) {
      wx.showToast({ title: '请先授权手机号', icon: 'none' })
      return
    }

    this.openFavoritesSheet()
  },

  openFavoritesSheet() {
    // Mount first, then open on next tick to trigger CSS transition.
    this.setData({ showFavoritesSheet: true, favoritesSheetOpen: false })

    setTimeout(() => {
      this.setData({ favoritesSheetOpen: true })
    }, 30)

    this.loadFavoritesJobs()
  },

  closeFavoritesSheet() {
    this.setData({ favoritesSheetOpen: false })

    setTimeout(() => {
      this.setData({ showFavoritesSheet: false })
    }, 260)
  },

  async loadFavoritesJobs() {
    const app = getApp<IAppOption>() as any
    const user = app?.globalData?.user
    const openid = user?.openid
    const isLoggedIn = !!(user && (user.isAuthed || user.phone))
    if (!isLoggedIn || !openid) {
      this.setData({ favoritesJobs: [] })
      return
    }

    this.setData({ favoritesLoading: true })
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
        this.setData({ favoritesJobs: [] })
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

      const merged: ResolvedFavoriteJob[] = []
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
      this.setData({ favoritesJobs: normalized })
    } catch (err) {
      console.error('[me] loadFavoritesJobs failed', err)
      wx.showToast({ title: '加载收藏失败', icon: 'none' })
    } finally {
      this.setData({ favoritesLoading: false })
    }
  },

  closeJobDetail() {
    this.setData({ showJobDetail: false })
  },

  onFavoriteJobTap(e: any) {
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

  onLanguageSelect(e: WechatMiniprogram.TouchEvent) {
    const value = (e.currentTarget.dataset.value || '') as string
    if (!value) return

    this.setData({ currentLanguage: value })
    wx.showToast({ title: '敬请期待', icon: 'none' })
    this.closeLanguageSheet()
  },

  onLanguageTap() {
    this.openLanguageSheet()
  },
})
