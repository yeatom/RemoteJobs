// miniprogram/components/article-detail/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
const swipeToCloseBehavior = require('../../behaviors/swipe-to-close')

Component({
  behaviors: [swipeToCloseBehavior],

  properties: {
    show: {
      type: Boolean,
      value: false,
    },
    articleData: {
      type: Object,
      value: undefined,
    },
  },

  data: {
    article: null as any,
    htmlNodes: [] as any[],
    loading: false,
    loadingText: '加载中...',
    loadFailedText: '加载失败',
    contentEmptyText: '内容为空',
  },

  lifetimes: {
    attached() {
      const app = getApp<IAppOption>() as any
      const updateLanguage = () => {
        const lang = normalizeLanguage(app?.globalData?.language)
        this.setData({ 
          loadingText: t('jobs.loading', lang),
          loadFailedText: t('jobs.loadFailed', lang),
          contentEmptyText: t('jobs.contentEmpty', lang),
        })
      }
      
      ;(this as any)._langListener = updateLanguage
      if (app?.onLanguageChange) app.onLanguageChange(updateLanguage)
      
      // 初始化
      updateLanguage()
    },

    detached() {
      const app = getApp<IAppOption>() as any
      const listener = (this as any)._langListener
      if (listener && app?.offLanguageChange) app.offLanguageChange(listener)
      ;(this as any)._langListener = null
    },
  },

  observers: {
    'show, articleData'(show: boolean, articleData: any) {
      if (show && articleData && (articleData._id || articleData.id)) {
        if ((this as any)._animation && typeof (this as any)._animation.stop === 'function') {
          ;(this as any)._animation.stop()
          ;(this as any)._animation = null
        }
        
        const windowInfo = wx.getWindowInfo()
        const screenWidth = windowInfo.windowWidth
        
        this.setData({ 
          animationData: null,
          drawerTranslateX: screenWidth,
        })
        
        setTimeout(() => {
          if (this.data.show && this.data.articleData) {
            this.setData({ drawerTranslateX: 0 })
          }
        }, 50)
        this.setArticleFromData(articleData)
      } else if (!show) {
        if ((this as any)._animation && typeof (this as any)._animation.stop === 'function') {
          ;(this as any)._animation.stop()
          ;(this as any)._animation = null
        }
        
        const windowInfo = wx.getWindowInfo()
        const screenWidth = windowInfo.windowWidth
        this.setData({
          article: null,
          htmlNodes: [],
          loading: false,
          drawerTranslateX: screenWidth,
          animationData: null,
        })
      }
    },
  },

  methods: {
    onClose() {
      (this as any).closeDrawer()
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
  },
})

