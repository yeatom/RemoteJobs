// miniprogram/pages/detail/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'
import { getJobFieldsByLanguage, mapJobFieldsToStandard } from '../../utils/job'

Page({
  data: {
    job: null as any,
    jobId: '' as string,
    collection: '' as string,
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
        wx.setNavigationBarTitle({ title: t('app.navTitle', lang) })
        
        // 语言变化时重新加载职位详情
        if (this.data.jobId && this.data.collection) {
          this.fetchJobDetails(this.data.jobId, this.data.collection)
        }
      },
    })

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
    wx.setNavigationBarTitle({ title: t('app.navTitle', lang) })
  },

  async fetchJobDetails(id: string, collection: string) {
    try {
      const db = wx.cloud.database()
      
      // 获取用户语言设置并确定字段名
      const app = getApp() as any
      const userLanguage = normalizeLanguage(app?.globalData?.language || 'Chinese')
      const { titleField, summaryField, descriptionField, salaryField, sourceNameField } = getJobFieldsByLanguage(userLanguage)
      
      let query: any = db.collection(collection).doc(id)
      
      // 根据语言选择字段，只查询需要的字段
      const fieldSelection: any = {
        _id: true,
        createdAt: true,
        source_url: true,
        team: true,
        type: true,
        tags: true,
        [titleField]: true,
        [summaryField]: true,
        [descriptionField]: true,
      }
      
      // 根据语言选择 salary 和 source_name 字段
      if (salaryField) {
        fieldSelection[salaryField] = true
        if (userLanguage === 'AIEnglish' && salaryField !== 'salary') {
          fieldSelection.salary = true
        }
      } else {
        fieldSelection.salary = true
      }
      
      if (sourceNameField) {
        fieldSelection[sourceNameField] = true
        if (userLanguage === 'AIEnglish' && sourceNameField !== 'source_name') {
          fieldSelection.source_name = true
        }
      } else {
        fieldSelection.source_name = true
      }
      
      query = query.field(fieldSelection)
      
      const res = await query.get()
      let jobData = res.data
      
      // 将查询的字段名映射回标准字段名
      if (jobData) {
        jobData = mapJobFieldsToStandard(jobData, titleField, summaryField, descriptionField, salaryField, sourceNameField)
      }
      
      this.setData({ job: jobData })
    } catch (err) {
      // ignore
    }
  },
})
