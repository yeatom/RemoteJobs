import { attachLanguageAware } from '../../utils/languageAware'
import { normalizeLanguage, t } from '../../utils/i18n'
import type { Article, ArticleItem } from '../../utils/article'

const typeToArticleId: Record<string, string> = {
  'online_event': 'online',
  'offline_event': 'offline',
  'success_forest': 'success',
  'skill_swap': 'skills',
}

const articleIdToI18nKey: Record<string, string> = {
  'online': 'community.onlineActivitiesTitle',
  'offline': 'community.offlineActivitiesTitle',
  'skills': 'community.skillExchangeTitle',
  'success': 'community.successStoriesTitle',
}

Page({
  data: {
    ui: {
      title: '社区',
      activitiesTitle: '社区活动',
      successStoriesTitle: '成功森林',
      jobHuntingTitle: '求职利剑',
      statusActive: '报名中',
      statusEnded: '已结束',
      desc: '敬请期待',
    },
    articles: [] as Article[],
    loading: true,
    showArticleDetail: false,
    selectedArticleData: null as any,
  },

  onLoad: function () {
    const self: any = this
    
    this.loadArticles()
    
    self._langDetach = attachLanguageAware(this, {
      onLanguageRevive: (lang) => {
        const originalArticles = self._originalArticles || this.data.articles
        
        const updatedArticles = originalArticles.map((article: Article) => {
          const i18nKey = articleIdToI18nKey[article.id]
          return {
            ...article,
            title: i18nKey ? t(i18nKey as any, lang) : article.title,
            items: article.items.map((item: ArticleItem) => ({
              ...item,
            }))
          }
        })

        this.setData({
          ui: {
            ...this.data.ui,
            title: t('community.title', lang),
            desc: t('community.desc', lang),
            statusActive: t('community.statusActive', lang),
            statusEnded: t('community.statusEnded', lang),
          },
          articles: updatedArticles,
        })
        wx.setNavigationBarTitle({ title: t('app.navTitle', lang) })
        
        try {
          const app: any = getApp()
          if (app && app.globalData) app.globalData.articles = updatedArticles
        } catch {
          // ignore
        }
      },
    })
  },

  async loadArticles() {
    this.setData({ loading: true })
    try {
      const db = wx.cloud.database()
      const res = await db.collection('articles').get()
      
      if (!res.data || res.data.length === 0) {
        this.setData({ articles: [], loading: false })
        return
      }
      
      const articlesByType = new Map<string, any[]>()
      for (const article of res.data) {
        const type = article.type
        if (!type || !typeToArticleId[type]) continue
        
        const list = articlesByType.get(type) || []
        list.push(article)
        articlesByType.set(type, list)
      }
      
      const articles: Article[] = []
      for (const [type, items] of articlesByType.entries()) {
        const articleId = typeToArticleId[type]
        const i18nKey = articleIdToI18nKey[articleId]
        const app: any = getApp()
        const lang = normalizeLanguage(app?.globalData?.language)
        
        articles.push({
          id: articleId,
          title: i18nKey ? t(i18nKey as any, lang) : type,
          items: items.map((item: any) => ({
            id: item._id,
            _id: item._id,
            image: item.image,
            title: item.title,
            description: item.description,
            status: item.status === 'active' || item.status === 'ended' ? item.status : undefined,
            richText: item.richText,
          }))
        })
      }
      
      const order = ['online', 'offline', 'skills', 'success']
      articles.sort((a, b) => {
        const idxA = order.indexOf(a.id)
        const idxB = order.indexOf(b.id)
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB)
      })
      
      const self: any = this
      self._originalArticles = JSON.parse(JSON.stringify(articles))
      
      const app: any = getApp()
      const lang = normalizeLanguage(app?.globalData?.language)
      const updatedArticles = articles.map((article: Article) => {
        const i18nKey = articleIdToI18nKey[article.id]
        return {
          ...article,
          title: i18nKey ? t(i18nKey as any, lang) : article.title,
          items: article.items.map((item: ArticleItem) => ({
            ...item,
          }))
        }
      })
      
      this.setData({ articles: updatedArticles, loading: false })
      
      try {
        const app: any = getApp()
        if (app && app.globalData) app.globalData.articles = updatedArticles
      } catch {
        // ignore
      }
    } catch (err: any) {
      const errorMsg = err.errMsg || err.message || '未知错误'
      wx.showToast({ 
        title: `加载失败: ${errorMsg}`,
        icon: 'none',
        duration: 3000
      })
      this.setData({ loading: false, articles: [] })
    }
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
  },
 
  onOpenArticleAll(e: any) {
    const id = e?.currentTarget?.dataset?.id
    if (!id) return
    wx.navigateTo({ url: `/pages/article-list/index?id=${id}` })
  },

  onArticleTap(e: any) {
    const item = e?.currentTarget?.dataset?.item
    if (!item) return
    
    this.setData({ 
      showArticleDetail: false,
      selectedArticleData: null,
    }, () => {
      this.setData({
        selectedArticleData: item,
        showArticleDetail: true,
      })
    })
  },

  closeArticleDetail() {
    this.setData({ showArticleDetail: false, selectedArticleData: null })
  },
})
