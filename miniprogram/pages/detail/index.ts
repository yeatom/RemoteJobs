// miniprogram/pages/detail/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'
import { getJobFieldsByLanguage, mapJobFieldsToStandard } from '../../utils/job'
import { callApi } from '../../utils/request'

Page({
  data: {
    job: null as any,
    jobId: '' as string,
    collection: '' as string,
    loadingText: 'Loading...',
  },

  onLoad(options) {
    // 保存 jobId 和 collection，以便语言变化时重新加载
    const jobId = options.id || ''
    const collection = options.collection || ''
    
    this.setData({ jobId, collection })

    // attach language-aware behavior
    ;(this as any)._langDetach = attachLanguageAware(this, {
      onLanguageRevive: () => {
        // Immediately set navigation bar title when language changes
        const app = getApp() as any
        const lang = normalizeLanguage(app?.globalData?.language)
        wx.setNavigationBarTitle({ title: '' })
        
        // 更新 loading 文本
        this.setData({ loadingText: t('jobs.loading', lang) })
        
        // 语言变化时重新加载职位详情
        if (this.data.jobId && this.data.collection) {
          this.fetchJobDetails(this.data.jobId, this.data.collection)
        }
      },
    })
    
    // 初始化 loading 文本
    const app = getApp() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    this.setData({ loadingText: t('jobs.loading', lang) })

    if (jobId && collection) {
      this.fetchJobDetails(jobId, collection)
    }
  },

  onUnload() {
    const fn = (this as any)._langDetach
    if (typeof fn === 'function') fn()
    ;(this as any)._langDetach = null
  },

  onShow() {
    // Set navigation bar title when page becomes visible
    const app = getApp() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    wx.setNavigationBarTitle({ title: '' })
  },

  async fetchJobDetails(id: string, collection: string) {
    try {
      // 获取用户语言设置并确定字段名
      const app = getApp() as any
      const userLanguage = normalizeLanguage(app?.globalData?.language || 'Chinese')
      
      const res = await callApi('getJobDetail', { id, collection })
      
      if (!res.result || !res.result.data) {
        throw new Error('Job not found');
      }

      let jobData = res.result.data
      
      // 映射字段
      const { titleField, summaryField, descriptionField, salaryField, sourceNameField } = getJobFieldsByLanguage(userLanguage)
      if (jobData) {
        jobData = mapJobFieldsToStandard(jobData, titleField, summaryField, descriptionField, salaryField, sourceNameField)
      }
      
      this.setData({ job: jobData })
    } catch (err) {
      // ignore
    }
  },
})
