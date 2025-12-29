// miniprogram/pages/community/index.ts

import { attachLanguageAware } from '../../utils/languageAware'
import { normalizeLanguage, t } from '../../utils/i18n'
import type { Article, ArticleItem } from '../../utils/article'

// Map database type to article id
const typeToArticleId: Record<string, string> = {
  'online_event': 'online',
  'offline_event': 'offline',
  'success_forest': 'success',
  'skill_swap': 'skills',
}

// Map article id to i18n key
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
    
    // Load articles from database
    this.loadArticles()
    
    // subscribe once for this page instance (this will call onLanguageRevive immediately)
    self._langDetach = attachLanguageAware(this, {
      onLanguageRevive: (lang) => {
        // Update articles with translated titles and status
        // Use original articles data structure to avoid translation accumulation
        const originalArticles = self._originalArticles || this.data.articles
        
        const updatedArticles = originalArticles.map((article: Article) => {
          const i18nKey = articleIdToI18nKey[article.id]
          return {
            ...article,
            title: i18nKey ? t(i18nKey as any, lang) : article.title,
            items: article.items.map((item: ArticleItem) => ({
              ...item,
              // status is 'active' or 'ended' from database, keep it as is
              // Display text is handled in WXML using ui.statusActive/ui.statusEnded
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
        // Immediately set navigation bar title when language changes
        wx.setNavigationBarTitle({ title: t('app.navTitle', lang) })
        
        // also publish articles to global for detail page
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
      console.log('[community] Starting to load articles from database...')
      const db = wx.cloud.database()
      
      // Try to query articles collection
      const res = await db.collection('articles').get()
      console.log('[community] Query result:', {
        dataLength: res.data?.length || 0,
        data: res.data,
        errMsg: res.errMsg,
      })
      
      if (!res.data || res.data.length === 0) {
        console.warn('[community] No articles found in database')
        this.setData({ articles: [], loading: false })
        return
      }
      
      // Group articles by type
      const articlesByType = new Map<string, any[]>()
      for (const article of res.data) {
        const type = article.type
        console.log('[community] Processing article:', { _id: article._id, type, title: article.title })
        
        if (!type || !typeToArticleId[type]) {
          console.warn('[community] Skipping article with invalid type:', type)
          continue
        }
        
        const list = articlesByType.get(type) || []
        list.push(article)
        articlesByType.set(type, list)
      }
      
      console.log('[community] Articles grouped by type:', Array.from(articlesByType.entries()).map(([type, items]) => ({ type, count: items.length })))
      
      // Convert to Article format
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
      
      // Sort articles by predefined order
      const order = ['online', 'offline', 'skills', 'success']
      articles.sort((a, b) => {
        const idxA = order.indexOf(a.id)
        const idxB = order.indexOf(b.id)
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB)
      })
      
      console.log('[community] Final articles count:', articles.length)
      
      const self: any = this
      self._originalArticles = JSON.parse(JSON.stringify(articles))
      
      // Apply language translations
      const app: any = getApp()
      const lang = normalizeLanguage(app?.globalData?.language)
      const updatedArticles = articles.map((article: Article) => {
        const i18nKey = articleIdToI18nKey[article.id]
        return {
          ...article,
          title: i18nKey ? t(i18nKey as any, lang) : article.title,
          items: article.items.map((item: ArticleItem) => ({
            ...item,
            // status is already 'active' or 'ended' from database, keep it as is
            // We'll use it for both display text and badge styling
          }))
        }
      })
      
      console.log('[community] Setting articles to state:', updatedArticles.length)
      this.setData({ articles: updatedArticles, loading: false })
      
      // Publish to global
      try {
        const app: any = getApp()
        if (app && app.globalData) app.globalData.articles = updatedArticles
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.error('[community] loadArticles failed:', err)
      console.error('[community] Error details:', {
        message: err.message,
        errCode: err.errCode,
        errMsg: err.errMsg,
        stack: err.stack,
      })
      
      // Show more detailed error message
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
 
  // Open article list page (shows list of items for this article)
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
