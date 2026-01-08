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
      loading: '加载中...',
      all: '全部',
    },
    articles: [] as Article[],
    displayArticles: [] as Article[],
    heroArticle: null as ArticleItem | null,
    loading: true,
    activeCategoryId: 'all',
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

        const heroArticle = updatedArticles.length > 0 && updatedArticles[0].items.length > 0 
          ? updatedArticles[0].items[0] 
          : null

        this.setData({
          ui: {
            ...this.data.ui,
            title: t('community.title', lang),
            desc: t('community.desc', lang),
            statusActive: t('community.statusActive', lang),
            statusEnded: t('community.statusEnded', lang),
            loading: t('jobs.loading', lang),
            all: lang === 'Chinese' ? '全部' : 'All',
          },
          articles: updatedArticles,
          displayArticles: this.data.activeCategoryId === 'all' 
            ? updatedArticles 
            : updatedArticles.filter(a => a.id === this.data.activeCategoryId),
          heroArticle,
        })
        wx.setNavigationBarTitle({ title: '' })
      },
    })
  },

  async loadArticles() {
    this.setData({ loading: true })
    try {
      const db = wx.cloud.database()
      const res = await db.collection('articles').get()
      
      if (!res.data || res.data.length === 0) {
        this.setData({ articles: [], displayArticles: [], loading: false })
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
            views: Math.floor(Math.random() * 2000) + 100,
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

      const heroArticle = updatedArticles.length > 0 && updatedArticles[0].items.length > 0 
        ? updatedArticles[0].items[0] 
        : null
      
      this.setData({ 
        articles: updatedArticles, 
        displayArticles: updatedArticles,
        heroArticle,
        loading: false,
        ui: {
          ...this.data.ui,
          all: lang === 'Chinese' ? '全部' : 'All',
        }
      })
    } catch (err: any) {
      const errorMsg = err.errMsg || err.message || '未知错误'
      wx.showToast({ 
        title: `加载失败: ${errorMsg}`,
        icon: 'none',
        duration: 3000
      })
      this.setData({ loading: false, articles: [], displayArticles: [] })
    }
  },

  onCategoryTap(e: any) {
    const id = e.currentTarget.dataset.id
    if (this.data.activeCategoryId === id) return

    const displayArticles = id === 'all' 
      ? this.data.articles 
      : this.data.articles.filter(a => a.id === id)

    this.setData({
      activeCategoryId: id,
      displayArticles
    })
  },

  onUnload: function () {
    const self: any = this
    const fn = self._langDetach
    if (typeof fn === 'function') fn()
    self._langDetach = null
  },

  onShow: function () {
    wx.setNavigationBarTitle({ title: '' })
  },
 
  onOpenArticleAll(e: any) {
    const id = e?.currentTarget?.dataset?.id
    if (!id) return
    wx.navigateTo({ url: `/pages/article-list/index?id=${id}` })
  },

  onArticleTap(e: any) {
    const item = e?.currentTarget?.dataset?.item
    if (!item) return
    
    const app = getApp<IAppOption>() as any
    if (app?.globalData?._pageData) {
      app.globalData._pageData.articleData = item
    }
    
    wx.navigateTo({
      url: '/pages/article-detail/index',
    })
  },
})
