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
  },

  watcher: null as any,

  onLoad() {
    this.syncLanguage()
    this.fetchResumes()
  },

  syncLanguage() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    this.setData({
      ui: {
        assetCount: t('resume.assetCount', lang),
        syncingAssets: t('resume.syncingAssets', lang),
        statusApplied: t('resume.statusApplied', lang),
        statusFailed: t('resume.statusFailed', lang),
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

  async fetchResumes() {
    this.setData({ loading: true })
    
    try {
      const res = await callApi('getGeneratedResumes', {
        limit: 20
      })

      const list = (res.result && res.result.data) || []
      this.processResumes(list)
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

