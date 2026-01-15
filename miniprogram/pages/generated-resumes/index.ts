import { normalizeLanguage, t } from '../../utils/i18n'
import { ui } from '../../utils/ui'
import { callApi, formatFileUrl } from '../../utils/request'

Page({
  data: {
    resumes: [] as any[],
    loading: true,
    page: 1,
    hasMore: true,
    ui: {} as any,
    isEditMode: false,
  },

  watcher: null as any,

  onLoad() {
    this.syncLanguage()
    this.fetchResumes()
    this.startPolling()
  },

  onShow() {
    // 每次显示页面时，如果不在轮询中，刷新一次列表
    if (!this.data.isPolling) {
       this.fetchResumes()
       this.startPolling()
    }
  },

  onUnload() {
    this.stopPolling()
  },

  onToggleEdit() {
    this.setData({
      isEditMode: !this.data.isEditMode
    } as any)
  },

  async onRetryResume(e: any) {
    const { item } = e.currentTarget.dataset
    if (!item || !item._id) return

    ui.showLoading('Retrying...')
    try {
        const res = await callApi('retryGenerateResume', {
            resumeId: item._id
        })
        
        ui.hideLoading()
        
        if (res.success) {
            ui.showSuccess('Started')
            // Refresh list immediately to show "Processing" status
            this.fetchResumes()
            this.startPolling()
        } else {
            wx.showModal({
                title: 'Retry Failed',
                content: res.message || 'Unknown error',
                showCancel: false
            })
        }
    } catch (err: any) {
        ui.hideLoading()
        console.error('Retry failed', err)
        ui.showError('Error')
    }
  },

  onDeleteResume(e: any) {
    const { item } = e.currentTarget.dataset
    if (!item || !item._id) return

    wx.showModal({
      title: this.data.ui.delete || 'Delete',
       // 简单这里直接硬编码中文提示，也可以根据语言
      content: this.data.currentLang === 'English' ? 'Are you sure you want to delete this resume?' : '确定要删除这份简历吗？删除后无法恢复。',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
            ui.showLoading('Deleting...')
            try {
                const res = await callApi('deleteGeneratedResume', {
                    resumeId: item._id
                })
                
                ui.hideLoading()
                
                if (res.success) {
                    ui.showSuccess('Success')
                    // Remove from local list
                    const updatedResumes = this.data.resumes.filter((r: any) => r._id !== item._id)
                    this.setData({ resumes: updatedResumes } as any);
                    
                    // If list becomes empty, exit edit mode
                    if (updatedResumes.length === 0) {
                        this.setData({ isEditMode: false } as any)
                    }
                } else {
                    ui.showError('Failed')
                }
            } catch (err) {
                ui.hideLoading()
                console.error('Delete failed', err)
                ui.showError('Error')
            }
        }
      }
    })
  },

  onHide() {
    this.stopPolling()
  },

  // 简单的轮询机制
  pollingTimer: null as any,
  startPolling() {
      if (this.data.isPolling) return
      
      this.setData({ isPolling: true } as any)
      
      this.pollingTimer = setInterval(() => {
          this.fetchResumes(true) // Silent update
      }, 3000)
  },

  stopPolling() {
      if (this.pollingTimer) {
          clearInterval(this.pollingTimer)
          this.pollingTimer = null
      }
      this.setData({ isPolling: false } as any)
  },

  async fetchResumes(silent = false) {
    if (!silent) this.setData({ loading: true })
    
    try {
      const res = await callApi('getGeneratedResumes', {
        limit: 20
      })

      const list = (res.result && res.result.data) || []
      this.processResumes(list)
      this.setData({ loading: false })
      
      // 检查是否还有 processing 状态的任务
      const hasProcessing = list.some((item: any) => item.status === 'processing')
      if (!hasProcessing) {
          this.stopPolling()
      } else {
          // 确保轮询开启
          if (!this.pollingTimer) this.startPolling()
      }

    } catch (err) {
      console.error('获取简历列表失败:', err)
      if (!silent) wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  syncLanguage() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    this.setData({
      currentLang: lang,
      ui: {
        assetCount: t('resume.assetCount', lang),
        syncingAssets: t('resume.syncingAssets', lang),
        statusFailed: t('resume.statusFailed', lang),
        edit: t('resume.edit', lang),
        done: t('resume.done', lang),
        delete: t('resume.delete', lang),
        retry: t('resume.retry', lang),
        generalResume: t('resume.generalResume', lang),
        view: t('resume.view', lang),
        loadFailed: t('jobs.loadFailed', lang),
        totalPrefix: t('resume.totalPrefix', lang),
        emptyTitle: t('resume.emptyTitle', lang),
        emptySubtitle: t('resume.emptySubtitle', lang),
        goJobs: t('resume.goJobs', lang),
      }
    })
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true }, () => {
      this.fetchResumes().then(() => {
        wx.stopPullDownRefresh()
      })
    })
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
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    
    // 如果还在生成中，不处理预览
    if (item.status === 'processing') {
      ui.showError(t('resume.aiProcessing', lang))
      return
    }

    if (item.status === 'failed') {
      wx.showModal({
        title: t('resume.generateFailed', lang),
        content: item.errorMessage || t('resume.tryAgain', lang),
        showCancel: false
      })
      return
    }

    if (!item.fileUrl && !item.fileId) return

    ui.showLoading('正在获取文件...')

    try {
      let tempFilePath = '';
      
      // 优先使用 fileUrl
      if (item.fileUrl) {
         const url = formatFileUrl(item.fileUrl);
         console.log('Downloading resume from:', url);
         const downloadRes = await new Promise<any>((resolve, reject) => {
             wx.downloadFile({
                 url,
                 success: resolve,
                 fail: reject
             })
         });
         if (downloadRes.statusCode === 200) {
             tempFilePath = downloadRes.tempFilePath;
         } else {
             throw new Error('Download failed status ' + downloadRes.statusCode);
         }
      } else if (item.fileId) {
        ui.showError('Old file unavailable (Cloud)');
        ui.hideLoading();
        return;
      }

      if (!tempFilePath) throw new Error('No file path obtained');

      // 2. 预览
      wx.openDocument({
        filePath: tempFilePath,
        showMenu: true,
        success: () => {
          ui.hideLoading()
        },
        fail: (err) => {
          console.error(err)
          ui.hideLoading()
          ui.showError('无法打开该文档')
        }
      })
    } catch (err) {
      console.error(err)
      ui.hideLoading()
      ui.showError('下载失败')
    }
  },

  goJobsList() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})

