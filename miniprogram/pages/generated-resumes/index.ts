import { normalizeLanguage } from '../../utils/i18n'

Page({
  data: {
    resumes: [] as any[],
    loading: true,
    page: 1,
    hasMore: true,
  },

  watcher: null as any,

  onLoad() {
    this.fetchResumes()
    this.initWatcher()
  },

  onUnload() {
    if (this.watcher) {
      this.watcher.close()
    }
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true }, () => {
      this.fetchResumes().then(() => {
        wx.stopPullDownRefresh()
      })
    })
  },

  initWatcher() {
    const db = wx.cloud.database()
    this.watcher = db.collection('generated_resumes')
      .orderBy('createTime', 'desc')
      .watch({
        onChange: (snapshot) => {
          console.log('[Watcher] snapshot:', snapshot)
          if (snapshot.docs) {
            this.processResumes(snapshot.docs)
          }
        },
        onError: (err) => {
          console.error('[Watcher] error:', err)
        }
      })
  },

  async fetchResumes() {
    this.setData({ loading: true })
    const db = wx.cloud.database()
    
    try {
      const res = await db.collection('generated_resumes')
        .orderBy('createTime', 'desc')
        .get()

      this.processResumes(res.data)
      this.setData({ loading: false })
    } catch (err) {
      console.error('获取简历列表失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  processResumes(data: any[]) {
    const formattedResumes = data.map((item: any) => {
      const date = item.createTime ? new Date(item.createTime) : new Date()
      return {
        ...item,
        formattedDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      }
    })

    this.setData({
      resumes: formattedResumes
    })
  },

  async onPreviewResume(e: any) {
    const item = e.currentTarget.dataset.item
    
    // 如果还在生成中，不处理预览
    if (item.status === 'processing') {
      wx.showToast({ title: 'AI 正在努力生成中，请稍候', icon: 'none' })
      return
    }

    if (item.status === 'failed') {
      wx.showModal({
        title: '生成失败',
        content: item.errorMessage || '请尝试重新生成',
        showCancel: false
      })
      return
    }

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

