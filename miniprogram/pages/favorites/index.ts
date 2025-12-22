// miniprogram/pages/favorites/index.ts
Page({
  data: {
    favorites: [] as any[],
    loading: false,
  },

  onShow() {
    this.loadFavorites()
  },

  async loadFavorites() {
    this.setData({ loading: true })
    try {
      const db = wx.cloud.database()
      const res = await db.collection('collected_jobs').orderBy('collectedAt', 'desc').get()
      this.setData({ favorites: res.data || [] })
    } catch (err) {
      console.error('[favorites] loadFavorites failed', err)
      wx.showToast({ title: '加载收藏失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  },
})

