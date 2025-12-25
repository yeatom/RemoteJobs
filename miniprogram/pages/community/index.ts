// miniprogram/pages/community/index.ts

import { attachLanguageAware } from '../../utils/languageAware'
import { normalizeLanguage, t } from '../../utils/i18n'

Page({
  data: {
    ui: {
      title: '社区',
      desc: '敬请期待',
    },
  },

  onLoad: function () {
    // subscribe once for this page instance
    const self: any = this
    self._langDetach = attachLanguageAware(this, {
      onLanguageRevive: (lang) => {
        this.setData({
          ui: {
            title: t('community.title', lang),
            desc: t('community.desc', lang),
          },
        })
        // Immediately set navigation bar title when language changes
        wx.setNavigationBarTitle({ title: t('app.navTitle', lang) })
      },
    })
  },

  onUnload: function () {
    const self: any = this
    const fn = self._langDetach
    if (typeof fn === 'function') fn()
    self._langDetach = null
  },

  onShow: function () {
    const app: any = getApp()
    const lang = normalizeLanguage(app && app.globalData ? app.globalData.language : null)

    wx.setNavigationBarTitle({ title: t('app.navTitle', lang) })

    this.setData({
      ui: {
        title: t('community.title', lang),
        desc: t('community.desc', lang),
      },
    })
  },
})
