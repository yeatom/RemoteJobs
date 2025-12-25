// miniprogram/pages/detail/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'

Page({
  data: {
    job: null as any,
  },

  onLoad(options) {
    // attach language-aware behavior
    ;(this as any)._langDetach = attachLanguageAware(this, {
      onLanguageRevive: () => {
        // Immediately set navigation bar title when language changes
        const app = getApp() as any
        const lang = normalizeLanguage(app?.globalData?.language)
        wx.setNavigationBarTitle({ title: t('app.navTitle', lang) })
      },
    })

    if (options.id && options.collection) {
      this.fetchJobDetails(options.id, options.collection)
    }
  },

  onUnload() {
    const fn = (this as any)._langDetach
    if (typeof fn === 'function') fn()
    ;(this as any)._langDetach = null
  },

  onShow() {
    // Set navigation bar title when page becomes visible
    const app = getApp() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    wx.setNavigationBarTitle({ title: t('app.navTitle', lang) })
  },

  async fetchJobDetails(id: string, collection: string) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection(collection).doc(id).get()
      this.setData({ job: res.data })
    } catch (err) {
      console.error('[detail] fetchJobDetails failed', err)
    }
  },
})
