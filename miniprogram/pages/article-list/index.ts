// Article list page - shows list of articles for a given type
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'
import type { Article } from '../../utils/article'

// Map article id to database type
const articleIdToType: Record<string, string> = {
  'online': 'online_event',
  'offline': 'offline_event',
  'success': 'success_forest',
  'skills': 'skill_swap',
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
    articleId: '',
    articles: [] as any[],
    title: '',
    loading: true,
    loadingText: '加载中...',
  },

  async onLoad(options: any) {
    const id = options.id || ''
    this.setData({ articleId: id })

    // 设置导航栏标题的辅助函数
    const updateTitle = () => {
      const app: any = getApp()
      const lang = normalizeLanguage(app?.globalData?.language)
      const i18nKey = articleIdToI18nKey[id]
      const title = i18nKey ? t(i18nKey as any, lang) : id
      this.setData({ title })
      wx.setNavigationBarTitle({ title: '' })
    }

    // 初始化标题
    updateTitle()

    // 添加语言监听
    ;(this as any)._langDetach = attachLanguageAware(this, {
      onLanguageRevive: (lang) => {
        // 语言变化时更新导航栏标题
        updateTitle()
        // 更新 loading 文本
        this.setData({ loadingText: t('jobs.loading', lang) })
      },
    })
    
    // 初始化 loading 文本
    const app: any = getApp()
    const lang = normalizeLanguage(app?.globalData?.language)
    this.setData({ loadingText: t('jobs.loading', lang) })

    const type = articleIdToType[id]
    if (!type) {
      wx.showToast({ title: '类型不存在', icon: 'none' })
      return
    }

    try {
      const db = wx.cloud.database()
      const res = await db.collection('articles').where({ type }).get()
      
      this.setData({
        articles: (res.data || []).map((item: any) => ({
          id: item._id,
          _id: item._id,
          image: item.image,
          title: item.title,
          description: item.description,
          status: item.status === 'active' || item.status === 'ended' ? item.status : undefined,
          richText: item.richText,
        })),
        loading: false,
      })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  onUnload() {
    const fn = (this as any)._langDetach
    if (typeof fn === 'function') fn()
    ;(this as any)._langDetach = null
  },

  onItemTap(e: any) {
    const item = e?.currentTarget?.dataset?.item
    if (!item) return
    
    // 存储到全局状态并跳转
    const app = getApp<IAppOption>() as any
    if (app?.globalData?._pageData) {
      app.globalData._pageData.articleData = item
    }
    
    wx.navigateTo({
      url: '/pages/article-detail/index',
    })
  },
})


