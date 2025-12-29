// miniprogram/components/article-detail/index.ts
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

