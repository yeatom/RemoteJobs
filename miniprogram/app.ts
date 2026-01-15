// app.ts
import { normalizeLanguage, type AppLanguage, t } from './utils/i18n'
import { request, callApi } from './utils/request'

type LangListener = (lang: AppLanguage) => void

App<IAppOption>({
  globalData: {
    user: null as any,
    userPromise: null as Promise<any> | null,
    language: 'Chinese' as AppLanguage,
    _langListeners: new Set<LangListener>(),
    // 页面跳转临时数据存储
    _pageData: {
      jobData: null as any,
      filterValue: null as any,
      filterTabIndex: 0,
      filterResult: null as any, // 筛选结果
      filterAction: null as string | null, // 'confirm' | 'reset' | null
    },
  } as any,

  async onLaunch() {
    // Fetch remote configuration for Maintenance and Beta modes
    this.refreshSystemConfig()

    this.applyLanguage()

    this.globalData.userPromise = this.refreshUser().catch(() => null)
    await this.globalData.userPromise

    const lang = ((this as any).globalData.language || 'Chinese') as AppLanguage
    this.applyLanguage()
    this.emitLanguageChange(lang)
  },

  onShow() {
    // 每次进入小程序都确保用户已在数据库中存在
    this.refreshUser().catch(() => null)
  },

  async refreshSystemConfig() {
    try {
      const res: any = await request({
        url: '/system-config',
        method: 'POST',
        data: {}
      })
      const config = res?.result?.data || res?.data || res
      
      this.globalData.systemConfig = config || { isBeta: true, isMaintenance: false }

      if (config && config.isMaintenance) {
        const lang = normalizeLanguage(this.globalData.language)
        const msg = config.maintenanceMessage || t('app.maintenanceMsg', lang)
        wx.reLaunch({
          url: '/pages/logs/logs?mode=maintenance&msg=' + encodeURIComponent(msg)
        })
      }
    } catch (err) {
      this.globalData.systemConfig = { isBeta: true, isMaintenance: false }
    }
  },

  applyLanguage() {
    const lang = ((this as any).globalData.language || 'Chinese') as AppLanguage

    // Tabbar text
    try {
      wx.setTabBarItem({ index: 0, text: t('tab.positions', lang) })
      wx.setTabBarItem({ index: 1, text: t('tab.jobs', lang) })
      wx.setTabBarItem({ index: 2, text: t('tab.me', lang) })
    } catch {
      // ignore
    }

    try {
      wx.setNavigationBarTitle({ title: '' })
    } catch {
      // ignore
    }
  },

  onLanguageChange(cb: LangListener) {
    ;(this as any).globalData._langListeners.add(cb)
  },

  offLanguageChange(cb: LangListener) {
    ;(this as any).globalData._langListeners.delete(cb)
  },

  emitLanguageChange(lang: AppLanguage) {
    const set: Set<LangListener> = (this as any).globalData._langListeners
    if (!set) return
    set.forEach((fn) => {
      try {
        fn(lang)
      } catch (e) {
        // ignore
      }
    })
  },

  async setLanguage(language: AppLanguage) {
    ;(this as any).globalData.language = language
    this.applyLanguage()
    this.emitLanguageChange(language)

    try {
      const res = await callApi('updateUserLanguage', { language })
      const updatedUser = res?.result?.user || (res as any)?.user
      if (updatedUser) {
        ;(this as any).globalData.user = updatedUser
      }
    } catch (err) {
      // ignore
    }
  },

  async refreshUser() {
    try {
      const res = await callApi('initUser', {})

      const openid = res?.result?.openid || (res as any)?.openid
      const user = (res?.result?.user || (res as any)?.user || null) as any

      const merged = user ? { ...user, openid } : (openid ? { openid } : null)
      
      // 检查会员状态并更新
      try {
        const memberStatusRes = await callApi('checkMemberStatus', {})
        
        const result = memberStatusRes?.result || (memberStatusRes as any)
        if (result?.success && merged) {
          merged.membership = result.membership
        }
      } catch (err) {
        // ignore
      }
      
      this.globalData.user = merged

      // Normalize database/user-provided language (handles 'english'/'chinese' etc.)
      const lang = normalizeLanguage(merged?.language)
      this.globalData.language = lang

      return merged
    } catch (err) {
      // Try to fallback to what we have in storage if we can't hit server
      const openid = wx.getStorageSync('user_openid');
      if (openid && !this.globalData.user) {
         this.globalData.user = { openid };
      }
      return this.globalData.user;
    }
  },
})
