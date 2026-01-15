// miniprogram/pages/job-detail/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
import { normalizeJobTags, translateFieldValue } from '../../utils/job'
import { attachLanguageAware } from '../../utils/languageAware'
// import { processAndSaveAIResume } from '../../utils/resume'
import { request, callApi } from '../../utils/request'
import { ui } from '../../utils/ui'
const { cloudRunEnv } = require('../../env.js')

const SAVED_COLLECTION = 'saved_jobs'
const SAVE_DEBOUNCE_DELAY = 300

function formatDescription(description?: string): string {
  if (!description) return ''
  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  return description
    .split(/\n+/)
    .map((line) => {
      const content = escapeHtml(line.trim())
      return `<p>${content || '&nbsp;'}</p>`
    })
    .join('')
}

type JobDetailItem = {
  _id: string
  createdAt: string
  source_url: string
  salary: string
  source_name: string
  summary: string
  description?: string
  team: string
  title: string
  type: string
  tags: string[]
  displayTags?: string[]
}

Page({
  data: {
    job: null as (JobDetailItem & { richDescription: string }) | null,
    loading: false,
    saved: false,
    saveBusy: false,
    saveDocId: '',
    isAIEnglish: false,
    isAIChinese: false,
    isStandardChinese: false,
    loadingText: '加载中...',
    loadFailedText: '加载失败',
    saveText: 'Saved',
    unsaveText: 'Save',
    oneClickApplyText: 'Resume Support',
    applyMenuTitle: 'Quick Apply',
    copySourceLinkText: 'Copy Source Link',
    aiResumeGenerateText: 'AI Resume Builder',
    oneClickSubmitResumeText: '',
    noSourceLinkText: 'No source link available',
    linkCopiedText: 'Link copied',
    featureDevelopingText: 'Feature under development',
    dataLoadFailedText: 'Failed to load data',
    pleaseLoginText: 'Please login/bind phone number first',
    saveSuccessText: 'Saved successfully',
    unsaveSuccessText: 'Unsaved successfully',
    operationFailedText: 'Operation failed',
    showApplyMenu: false,
    applyMenuOpen: false,
    isGenerating: false,
  },

  onLoad() {
    // 先更新语言，确保所有文本都已初始化
    this.updateLanguage()
    
    // 从全局状态获取数据
    const app = getApp<IAppOption>() as any
    const jobData = app?.globalData?._pageData?.jobData

    if (jobData && jobData._id) {
      this.setJobFromData(jobData)
      // 清除临时数据
      if (app?.globalData?._pageData) {
        app.globalData._pageData.jobData = null
      }
    } else {
      this.setData({ loading: false })
      wx.showToast({ title: this.data.dataLoadFailedText, icon: 'none' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }

    // attach language-aware behavior
    ;(this as any)._langDetach = attachLanguageAware(this, {
      onLanguageRevive: () => {
        wx.setNavigationBarTitle({ title: '' })
        this.updateLanguage()
        // 如果已有数据，根据语言重新处理显示
        if (this.data.job) {
          const app = getApp<IAppOption>() as any
          const lang = normalizeLanguage(app?.globalData?.language)
          const job = this.data.job
          
          // 根据当前语言环境，优先选择对应的翻译内容
          let currentDesc = job.description || ''
          if (lang === 'AIChinese' && (job as any).description_chinese) {
            currentDesc = (job as any).description_chinese
          } else if (lang === 'AIEnglish' && (job as any).description_english) {
            currentDesc = (job as any).description_english
          }

          const experience = (job as any).experience && typeof (job as any).experience === 'string' ? (job as any).experience.trim() : ''
          const { displayTags } = normalizeJobTags(job, lang, experience)
          const salary = job.salary && typeof job.salary === 'string' ? job.salary.trim() : ''
          const translatedSalary = translateFieldValue(salary, 'salary', lang)
          
          this.setData({
            job: {
              ...job,
              richDescription: formatDescription(currentDesc),
              salary: translatedSalary || salary,
              displayTags,
            } as any,
          })
        }
      },
    })

    this.updateLanguage()
  },

  onUnload() {
    const fn = (this as any)._langDetach
    if (typeof fn === 'function') fn()
    ;(this as any)._langDetach = null
  },

  onShow() {
    wx.setNavigationBarTitle({ title: '' })
  },

  updateLanguage() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    this.setData({
      isAIEnglish: lang === 'AIEnglish',
      isAIChinese: lang === 'AIChinese',
      isStandardChinese: lang === 'Chinese',
      loadingText: t('jobs.loading', lang),
      loadFailedText: t('jobs.loadFailed', lang),
      saveText: lang === 'Chinese' || lang === 'AIChinese' ? '已收藏' : 'Saved',
      unsaveText: lang === 'Chinese' || lang === 'AIChinese' ? '收藏' : 'Save',
      oneClickApplyText: lang === 'Chinese' || lang === 'AIChinese' ? '简历服务' : 'Resume Support',
      applyMenuTitle: t('jobs.applyMenuTitle', lang),
      copySourceLinkText: t('jobs.copySourceLink', lang),
      aiResumeGenerateText: t('jobs.aiResumeGenerate', lang),
      oneClickSubmitResumeText: t('jobs.oneClickSubmitResume', lang),
      noSourceLinkText: t('jobs.noSourceLink', lang),
      linkCopiedText: t('jobs.linkCopied', lang),
      featureDevelopingText: t('jobs.featureDeveloping', lang),
      dataLoadFailedText: t('jobs.dataLoadFailed', lang),
      pleaseLoginText: t('jobs.pleaseLogin', lang),
      saveSuccessText: t('jobs.saveSuccess', lang),
      unsaveSuccessText: t('jobs.unsaveSuccess', lang),
      operationFailedText: t('jobs.operationFailed', lang),
      ui: {
        unknownCompany: t('jobs.unknownCompany', lang),
        cancel: t('resume.cancel', lang),
      }
    })
  },

  async setJobFromData(jobData: any) {
    const _id = jobData._id
    if (!_id) return

    let displayTags = jobData.displayTags
    if (!displayTags || !Array.isArray(displayTags) || displayTags.length === 0) {
      const app = getApp<IAppOption>() as any
      const lang = normalizeLanguage(app?.globalData?.language)
      const experience = jobData.experience && typeof jobData.experience === 'string' ? jobData.experience.trim() : ''
      
      const { displayTags: generatedDisplayTags } = normalizeJobTags(jobData, lang, experience)
      displayTags = generatedDisplayTags
    }

    const isSaved = jobData.isSaved !== undefined ? jobData.isSaved : null
    
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    const salary = jobData.salary && typeof jobData.salary === 'string' ? jobData.salary.trim() : ''
    const translatedSalary = translateFieldValue(salary, 'salary', lang)
    
    this.setData({
      job: {
        ...jobData,
        salary: translatedSalary || salary,
        displayTags,
        richDescription: formatDescription(jobData.description),
      } as JobDetailItem & { richDescription: string },
      loading: false,
      saved: isSaved !== null ? isSaved : false,
    })

    if (isSaved === null) {
      try {
        const isSavedState = await this.checkSavedState(_id, true)
        this.setData({ saved: isSavedState })
      } catch (err) {
        this.setData({ saved: false })
      }
    }
  },

  async toggleSave() {
    const job = this.data.job
    if (!job || this.data.saveBusy) return

    const app = getApp<IAppOption>() as any
    const user = app?.globalData?.user
    const isVerified = !!(user && (user.isAuthed || user.phone))
    if (!isVerified) {
      wx.showToast({ title: this.data.pleaseLoginText, icon: 'none' })
      return
    }

    this.setData({ saveBusy: true })
    const targetSaved = !this.data.saved

    try {
      if (targetSaved) {
        await this.addSavedRecord(job)
      } else {
        await this.removeSavedRecord(job._id)
      }

      this.setData({ saved: targetSaved })
      
      ui.showSuccess(targetSaved ? (this.data.saveSuccessText || 'Saved') : (this.data.unsaveSuccessText || 'Unsaved'))
    } catch (err) {
      ui.showError(this.data.operationFailedText || 'Error')
    } finally {
      setTimeout(() => {
        this.setData({ saveBusy: false })
      }, SAVE_DEBOUNCE_DELAY)
    }
  },

  onOneClickApply() {
    // 如果弹窗已打开，则关闭
    if (this.data.showApplyMenu && this.data.applyMenuOpen) {
      this.closeApplyMenu()
      return
    }
    // 否则打开弹窗
    this.setData({ showApplyMenu: true })
    setTimeout(() => {
      this.setData({ applyMenuOpen: true })
    }, 50)
  },

  closeApplyMenu() {
    this.setData({ applyMenuOpen: false })
    setTimeout(() => {
      this.setData({ showApplyMenu: false })
    }, 300)
  },

  onViewSource() {
    const job = this.data.job
    if (!job?.source_url) {
      ui.showError(this.data.noSourceLinkText || 'No Link')
      return
    }
    this.closeApplyMenu()
    // 复制链接或打开链接
    wx.setClipboardData({
      data: job.source_url,
      success: () => {
        // UI feedback already shown by wx.setClipboardData toast usually, 
        // but we can use our ui.showSuccess if we want to override or ensure consistency
        ui.showSuccess(this.data.linkCopiedText || 'Copied')
      },
    })
  },

  async onGenerateResume() {
    this.closeApplyMenu()
    
    const app = getApp<IAppOption>() as any
    const jobId = this.data.job?._id
    
    try {
      ui.showLoading('检查状态...')
      
      // 1. 前置检查：是否已经为该岗位生成过简历
      const checkRes = await callApi('getGeneratedResumes', {
        jobId,
        status: 'completed',
        limit: 1
      })
      const existingList = (checkRes.result && checkRes.result.data) || []

      if (existingList.length > 0) {
        ui.hideLoading()
        wx.showModal({
          title: '已生成过简历',
          content: '您已为该岗位生成过定制简历，是否需要重新生成？',
          confirmText: '重新生成',
          cancelText: '查看简历',
          success: (res) => {
            if (res.confirm) {
              this.doGenerateResumeAction()
            } else if (res.cancel) {
              wx.navigateTo({
                url: '/pages/generated-resumes/index'
              })
            }
          }
        })
        return
      }

      // 2. 如果没有生成过，直接进入生成流程
      await this.doGenerateResumeAction()
      
    } catch (err) {
      ui.hideLoading()
      console.error('检查记录失败:', err)
      // 如果检查失败，为了不阻塞用户，直接尝试生成
      this.doGenerateResumeAction()
    }
  },

  async doGenerateResumeAction() {
    if (this.data.isGenerating) return
    const app = getApp<IAppOption>() as any
    
    try {
      this.setData({ isGenerating: true })
      ui.showLoading('正在连接 AI...', false)
      
      // 实时请求数据库获取最新的完整度
      const user = await app.refreshUser()
      
      const profile = user?.resume_profile || {}
      const comp_cn = user?.resume_completeness || 0
      const comp_en = user?.resume_completeness_en || 0

      // Manual check for basic completeness (fallback if backend flag is outdated)
      const p_zh = profile.zh || {}
      const p_en = profile.en || {}
      
      // CN: Require Name + (Email/Phone/Wechat) + Edu + Work
      const hasBasicZh = !!p_zh.name && (!!p_zh.email || !!p_zh.phone || !!p_zh.wechat) && (p_zh.educations?.length > 0) && (p_zh.workExperiences?.length > 0)
      
      // EN: Require Name + (Email/PhoneEn/Whatsapp/Telegram/Linkedin/Website) + Edu + Work (Location is optional but good)
      const hasBasicEn = !!p_en.name && (!!p_en.email || !!p_en.phone_en || !!p_en.whatsapp || !!p_en.telegram || !!p_en.linkedin || !!p_en.personal_website) && (p_en.educations?.length > 0) && (p_en.workExperiences?.length > 0)

      // Determine language context
      const lang = normalizeLanguage(app?.globalData?.language)
      const isChineseEnv = (lang === 'Chinese' || lang === 'AIChinese')
      
      let isReady = false
      if (isChineseEnv) {
        // In Chinese env, check Chinese resume
        isReady = (comp_cn >= 1 || hasBasicZh)
      } else {
        // In English env, check English resume
        isReady = (comp_en >= 1 || hasBasicEn)
      }

      // Check Readiness
      if (isReady) {
        // 简历完整，调用云托管接口
        try {
          // Prepare Profile based on context
          let aiProfile: any = {}
          if (isChineseEnv) {
            aiProfile = { ...profile.zh }
            aiProfile.en = profile.en
          } else {
            aiProfile = { ...profile.en }
            aiProfile.zh = profile.zh
          }
          
          const res: any = await callApi('generate', {
            jobId: this.data.job?._id, // 岗位 ID
            userId: user.openid,      // 用户 ID (OpenID)
            resume_profile: aiProfile, // 传处理后的资料
            job_data: this.data.job,    // 传完整的岗位 JSON
            language: isChineseEnv ? 'chinese' : 'english' // Strictly normalize to 'chinese' or 'english'
          })

          ui.hideLoading()
          this.setData({ isGenerating: false })
          
          if (res && res.task_id) {
            const taskId = res.task_id
            
            // 提示用户任务已提交
            wx.showModal({
              title: isChineseEnv ? '生成请求已提交' : 'Request Submitted',
              content: isChineseEnv 
                ? 'AI 正在为你深度定制简历，大约需要 30 秒。完成后将在“我的简历”中展示，你可以继续浏览其他岗位。'
                : 'AI is customizing your resume, usually takes 30s. Check "Generated Resumes" later.',
              confirmText: isChineseEnv ? '去看看' : 'Check',
              cancelText: isChineseEnv ? '留在本页' : 'Stay',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.navigateTo({
                    url: '/pages/generated-resumes/index'
                  })
                }
              }
            })
          } else {
            console.error('接口返回异常:', res)
            throw new Error('服务响应异常')
          }
        } catch (err: any) {
          ui.hideLoading()
          this.setData({ isGenerating: false })
          
          const isQuotaError = (err?.statusCode === 403) || (err?.data?.error === 'Quota exhausted') || (err?.message && err.message.includes('Quota'));

          // 如果是配额不足
          if (isQuotaError) {
             wx.showModal({
                 title: isChineseEnv ? '生成额度已用完' : 'Quota Exhausted',
                 content: isChineseEnv 
                    ? '您的简历生成额度已用完。请升级会员或购买积分。' 
                    : 'Your resume generation quota has been used up. Please upgrade your plan or top-up points.',
                 confirmText: isChineseEnv ? '去升级' : 'Upgrade',
                 cancelText: isChineseEnv ? '取消' : 'Cancel',
                 success: (res) => {
                     if (res.confirm) {
                         wx.switchTab({
                             url: '/pages/me/index',
                             success: (e) => {
                                 // Store a flag in app global data or storage to open hub
                                 const app = getApp<IAppOption>() as any;
                                 if (app.globalData) app.globalData.openMemberHubOnShow = true;
                             }
                         })
                     }
                 }
             })
             return;
          }

          wx.showModal({
            title: isChineseEnv ? '生成失败' : 'Generate Failed',
            content: err?.data?.message || err?.message || (isChineseEnv ? '系统繁忙，请稍后再试' : 'System busy, please try again later.'),
            showCancel: false
          })
        }
      } else {
        ui.hideLoading()
        this.setData({ isGenerating: false })
        
        // Construct localized error message
        const missing = []
        
        if (isChineseEnv) {
           if (!p_zh.name) missing.push('姓名')
           if (!(p_zh.email || p_zh.phone || p_zh.wechat)) missing.push('联系方式')
           if (!(p_zh.educations?.length > 0)) missing.push('教育经历')
           if (!(p_zh.workExperiences?.length > 0)) missing.push('工作经历')
        } else {
           if (!p_en.name) missing.push('Name')
           const hasContact = p_en.email || p_en.phone_en || p_en.whatsapp || p_en.telegram || p_en.linkedin || p_en.personal_website
           if (!hasContact) missing.push('Contact')
           if (!(p_en.educations?.length > 0)) missing.push('Education')
           if (!(p_en.workExperiences?.length > 0)) missing.push('Experience')
        }
        
        const content = missing.length > 0 
          ? `${isChineseEnv ? '为了生成效果，请至少补全当前语言简历的' : 'Please complete your current language profile'}: ${missing.join('、')}`
          : (isChineseEnv ? '请先完善简历资料' : 'Please complete your profile')

        // 简历不完整，跳转到简历资料页
        wx.showModal({
          title: isChineseEnv ? '简历信息不完整' : 'Profile Incomplete',
          content: content,
          confirmText: isChineseEnv ? '去完善' : 'Edit Profile',
          cancelText: isChineseEnv ? '取消' : 'Cancel',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/resume-profile/index',
              })
            }
          }
        })
      }
    } catch (err) {
      ui.hideLoading()
      this.setData({ isGenerating: false })
      console.error('检查完整度失败:', err)
      ui.showError('系统检查失败')
    }
  },

  async addSavedRecord(job: JobDetailItem) {
    const app = getApp<IAppOption>() as any
    const openid = app?.globalData?.user?.openid
    if (!openid) throw new Error('missing openid')

    const res = await callApi('saveJob', {
      jobId: job._id,
      type: job.type,
      createdAt: job.createdAt,
    })

    const result = res.result || (res as any)
    this.setData({ saveDocId: String(result?._id || '') })
  },

  async removeSavedRecord(_id: string) {
    const app = getApp<IAppOption>() as any
    const openid = app?.globalData?.user?.openid
    if (!openid) return

    await callApi('unsaveJob', { jobId: _id })
    this.setData({ saveDocId: '' })
  },

  async checkSavedState(_id: string, silent = false) {
    if (!_id) return false

    const app = getApp<IAppOption>() as any
    const openid = app?.globalData?.user?.openid
    if (!openid) {
      if (!silent) this.setData({ saved: false, saveDocId: '' })
      return false
    }

    try {
      const res = await callApi('checkJobSaved', { jobId: _id })
      const result = res.result || (res as any)
      const exists = !!result?.exists
      const updates: Partial<typeof this.data> = {
        saveDocId: String(result?._id || ''),
      }
      if (!silent) updates.saved = exists
      this.setData(updates)
      return exists
    } catch (err) {
      if (!silent) {
        this.setData({ saved: false, saveDocId: '' })
      } else {
        this.setData({ saveDocId: '' })
      }
      return false
    }
  },
})

