// miniprogram/pages/article-detail/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'

Page({
  data: {
    article: null as any,
    htmlNodes: [] as any[],
    loading: false,
    loadingText: '加载中...',
    loadFailedText: '加载失败',
    contentEmptyText: '内容为空',
  },

  onLoad() {
    // 从全局状态获取数据
    const app = getApp<IAppOption>() as any
    const articleData = app?.globalData?._pageData?.articleData

    if (articleData && (articleData._id || articleData.id)) {
      this.setArticleFromData(articleData)
      // 清除临时数据
      if (app?.globalData?._pageData) {
        app.globalData._pageData.articleData = null
      }
    } else {
      this.setData({ loading: false })
      wx.showToast({ title: '数据加载失败', icon: 'none' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }

    // attach language-aware behavior
    ;(this as any)._langDetach = attachLanguageAware(this, {
      onLanguageRevive: () => {
        const app = getApp<IAppOption>() as any
        const lang = normalizeLanguage(app?.globalData?.language)
        wx.setNavigationBarTitle({ title: '' })
        this.updateLanguage()
      },
    })

    this.updateLanguage()
  },

  onUnload() {
    const fn = (this as any)._langDetach
    if (typeof fn === 'function') fn()
    ;(this as any)._langDetach = null
  },

  onShow() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    wx.setNavigationBarTitle({ title: '' })
  },

  updateLanguage() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    this.setData({
      loadingText: t('jobs.loading', lang),
      loadFailedText: t('jobs.loadFailed', lang),
      contentEmptyText: t('jobs.contentEmpty', lang),
    })
  },

  setArticleFromData(articleData: any) {
    if (!articleData) return

    let htmlNodes: any = null
    if (articleData.richText) {
      htmlNodes = articleData.richText
    } else {
      let html = ''
      if (articleData.title) {
        html += `<h3 style="margin:0 0 8px 0;font-size:40rpx;font-weight:600;color:#111827;">${articleData.title}</h3>`
      }
      if (articleData.description) {
        html += `<div style="margin:0 0 16px 0;font-size:28rpx;color:#374151;line-height:1.6;">${articleData.description}</div>`
      }
      htmlNodes = html || null
    }

    this.setData({
      article: articleData,
      htmlNodes,
      loading: false,
    })
  },
})

