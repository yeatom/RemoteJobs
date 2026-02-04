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

    // NO Loading as per user request for minimal UI interference
    try {
        const res = await callApi('retryGenerateResume', {
            resumeId: item._id
        })
        
        if (res.success) {
            ui.showSuccess(this.data.currentLang === 'English' ? 'Retrying...' : '已开始重试')
            
            // Start polling first to ensure we don't miss the window
            this.startPolling()
            
            // Then refresh to show "Processing" status immediately
            // Await it so we are sure the list reflects the new state
            await this.fetchResumes(true)
        } else {
            wx.showModal({
                title: 'Retry Failed',
                content: res.message || 'Unknown error',
                showCancel: false
            })
        }
    } catch (err: any) {
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
      if (!silent) ui.showToast('加载失败')
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
      ui.showToast(t('resume.aiProcessing', lang))
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
         } else if (downloadRes.statusCode === 404) {
              // 物理文件由于 24 小时过期已被系统回收，触发免 AI 重新渲染恢复
              ui.hideLoading();
              wx.showLoading({ title: '过期文件恢复中...', mask: true });
              
              try {
                 const restoreRes = await callApi('restoreResume', {
                     resumeId: item._id
                 });
                 
                 if (restoreRes.success) {
                     // 启动轮询，这样列表会自动更新显示 "Processing"
                     this.startPolling();
                     // 提示用户稍等
                     setTimeout(() => {
                         wx.hideLoading();
                         ui.showToast('文件已在云端重新渲染中，请稍候')
                     }, 500);
                 } else {
                     throw new Error(restoreRes.message || 'Restoration failed');
                 }
                 return; // 退出，等待轮询
              } catch (restoreErr: any) {
                  console.error('Restore failed:', restoreErr);
                  ui.showError(restoreErr.message || '文件已过期且无法恢复');
                  return;
              }
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

