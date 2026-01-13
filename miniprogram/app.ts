// app.ts
import { normalizeLanguage, type AppLanguage, t } from './utils/i18n'

type LangListener = (lang: AppLanguage) => void

App<IAppOption>({
  globalData: {
    user: null as any,
    userPromise: null as Promise<any> | null,
    language: 'Chinese' as AppLanguage,
    _langListeners: new Set<LangListener>(),
    // 页面跳转临时数据存储
    _pageData: {
      articleData: null as any,
      jobData: null as any,
      filterValue: null as any,
      filterTabIndex: 0,
      filterResult: null as any, // 筛选结果
      filterAction: null as string | null, // 'confirm' | 'reset' | null
    },
  } as any,

  async onLaunch() {
    if (!wx.cloud) {
      return
    }

    wx.cloud.init({
      env: require('./env.js').cloudEnv,
      traceUser: true,
    })

    // Fetch remote configuration for Maintenance and Beta modes
    this.refreshSystemConfig()

    this.applyLanguage()

    this.globalData.userPromise = this.refreshUser().catch(() => null)
    await this.globalData.userPromise

    const lang = ((this as any).globalData.language || 'Chinese') as AppLanguage
    this.applyLanguage()
    this.emitLanguageChange(lang)
  },

  async refreshSystemConfig() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('system_config').where({ id: 'global_settings' }).limit(1).get()
      const config = (res.data && res.data[0]) as any
      
      this.globalData.systemConfig = config || { isBeta: true, isMaintenance: false }

      if (config && config.isMaintenance) {
        const lang = normalizeLanguage(this.globalData.language)
        const msg = config.maintenanceMessage || t('app.maintenanceMsg', lang)
        wx.reLaunch({
          url: '/pages/logs/logs?mode=maintenance&msg=' + encodeURIComponent(msg)
        })
      }
    } catch (err) {
      console.warn('System config not found or accessible, using defaults.')
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
      const res: any = await wx.cloud.callFunction({
        name: 'updateUserLanguage',
        data: { language },
      })
      const updatedUser = res?.result?.user
      if (updatedUser) {
        ;(this as any).globalData.user = updatedUser
      }
    } catch (err) {
      // ignore
    }
  },

  async refreshUser() {
    const res: any = await wx.cloud.callFunction({
      name: 'initUser',
      data: {},
    })

    const openid = res?.result?.openid
    const user = (res?.result?.user || null) as any

    const merged = user ? { ...user, openid } : (openid ? { openid } : null)
    
    // 检查会员状态并更新
    try {
      const memberStatusRes: any = await wx.cloud.callFunction({
        name: 'checkMemberStatus',
        data: {},
      })
      
      if (memberStatusRes?.result?.success && merged) {
        merged.membership = memberStatusRes.result.membership
      }
    } catch (err) {
      // 如果检查失败，使用原有数据
      console.error('检查会员状态失败:', err)
    }
    
    ;(this as any).globalData.user = merged

    // Normalize database/user-provided language (handles 'english'/'chinese' etc.)
    const lang = normalizeLanguage(merged?.language)
    ;(this as any).globalData.language = lang

    return merged
  },
})
