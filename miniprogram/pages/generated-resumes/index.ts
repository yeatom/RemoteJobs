import { normalizeLanguage } from '../../utils/i18n'

Page({
  data: {
    resumes: [] as any[],
    loading: true,
    page: 1,
    hasMore: true,
  },

  onLoad() {
    this.fetchResumes()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true }, () => {
      this.fetchResumes().then(() => {
        wx.stopPullDownRefresh()
      })
    })
  },

  async fetchResumes() {
    this.setData({ loading: true })
    const db = wx.cloud.database()
    
    try {
      const res = await db.collection('generated_resumes')
        .orderBy('createTime', 'desc')
        .get()

      const formattedResumes = res.data.map((item: any) => {
        const date = new Date(item.createTime)
        return {
          ...item,
          formattedDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        }
      })

      this.setData({
        resumes: formattedResumes,
        loading: false
      })
    } catch (err) {
      console.error('获取简历列表失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  async onPreviewResume(e: any) {
    const item = e.currentTarget.dataset.item
    if (!item.fileId) return

    wx.showLoading({ title: '正在获取文件...', mask: true })

    try {
      // 1. 从云存储下载
      const downloadRes = await wx.cloud.downloadFile({
        fileID: item.fileId
      })

      // 2. 预览
      wx.openDocument({
        filePath: downloadRes.tempFilePath,
        showMenu: true,
        success: () => {
          wx.hideLoading()
        },
        fail: (err) => {
          wx.hideLoading()
          wx.showToast({ title: '无法打开该文档', icon: 'none' })
        }
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '下载失败', icon: 'none' })
    }
  },

  goJobsList() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})

