// miniprogram/pages/job-detail/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
import { normalizeJobTags, translateFieldValue } from '../../utils/job'
import { attachLanguageAware } from '../../utils/languageAware'
// import { processAndSaveAIResume } from '../../utils/resume'
import { request, callApi } from '../../utils/request'
import { StatusCode, StatusMessage } from '../../utils/statusCodes'
import { ui } from '../../utils/ui'
import { checkIsAuthed } from '../../utils/util'
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
      ui.showToast(this.data.dataLoadFailedText)
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
    const isVerified = checkIsAuthed(user)
    if (!isVerified) {
      ui.showToast(this.data.pleaseLoginText)
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
  },

  closeApplyMenu() {
    this.setData({ showApplyMenu: false })
  },


  onViewSource() {
    const job = this.data.job
    if (!job?.source_url) {
      ui.showToast(this.data.noSourceLinkText || 'No Link')
      return
    }
    this.closeApplyMenu()
    // 复制链接或打开链接
    wx.setClipboardData({
      data: job.source_url,
      success: () => {
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
      const checkRes = await callApi<any>('getGeneratedResumes', {
        jobId,
        status: 'completed',
        limit: 1
      })
      const existingList = checkRes.result?.items || []

      if (existingList.length > 0) {
        ui.hideLoading()
        ui.showModal({
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
      // [Optimization] Removed loading as per user request to use popups/toasts for result instead
      
      // 实时请求数据库获取最新的完整度
      const user = await app.refreshUser()
      
      const profile = user?.resume_profile || {}
      
      // Determine language context
      const lang = normalizeLanguage(app?.globalData?.language)
      const isChineseEnv = (lang === 'Chinese' || lang === 'AIChinese')
      
      // 直接根据后端存储的 level 判断
      const completeness = isChineseEnv 
        ? (profile.zh?.completeness || { level: 0 }) 
        : (profile.en?.completeness || { level: 0 });

      let isReady = completeness.level >= 1;

      // Check Readiness
      if (isReady) {
        // 简历完整，调用云托管接口
        try {
          // Prepare Profile based on context
          // 确保所有顶层字段（性别、照片、AI指令等）以及数组字段（经历、技能等）都能正确传递
          let aiProfile: any = {
            ...profile,           // 包含根层级的 gender, photo, birthday, aiMessage, skills, workExperiences 等
            gender: user.gender,  // 显式确保关键字段
            photo: user.avatar || profile.photo
          }
          
          const currentLangProfile = isChineseEnv ? (profile.zh || {}) : (profile.en || {})
          
          // 深度合并当前语言特有信息
          aiProfile = {
            ...aiProfile,
            ...currentLangProfile,
            // 确保数组字段存在，优先级：当前语言包 > 根目录 > 空数组
            workExperiences: currentLangProfile.workExperiences || profile.workExperiences || [],
            educations: currentLangProfile.educations || profile.educations || [],
            skills: currentLangProfile.skills || profile.skills || [],
            certificates: currentLangProfile.certificates || profile.certificates || [],
            // 携带引用以供 AI 参考
            zh: profile.zh,
            en: profile.en
          }
          
          const res = await callApi<any>('generate', {
            jobId: this.data.job?._id, // 岗位 ID
            openid: user.openid,      // Standardized OpenID
            resume_profile: aiProfile, // 传处理后的资料
            job_data: this.data.job,    // 传完整的岗位 JSON
            language: isChineseEnv ? 'chinese' : 'english' // Strictly normalize to 'chinese' or 'english'
          })

          ui.hideLoading()
          this.setData({ isGenerating: false })
          
          if (res.success && res.result?.task_id) {
            const taskId = res.result.task_id
            
            // 提示用户任务已提交
            ui.showModal({
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
          
          const isQuotaError = (err?.data?.code === StatusCode.QUOTA_EXHAUSTED) || (err?.statusCode === StatusCode.HTTP_FORBIDDEN) || (err?.data?.error === 'Quota exhausted');
          const isProcessingError = (err?.statusCode === StatusCode.HTTP_CONFLICT) || (err?.data?.message && err.data.message.includes('生成中'));

          // 1. 如果是正在生成中 (StatusCode.HTTP_CONFLICT)
          if (isProcessingError) {
            ui.showModal({
                title: isChineseEnv ? '生成中' : 'Processing',
                content: isChineseEnv 
                  ? '该岗位的定制简历还在生成中，请耐心等待，无需重复提交。' 
                  : 'Resume for this job is still being generated. Please wait.',
                showCancel: false,
                confirmText: isChineseEnv ? '知道了' : 'OK'
            });
            return;
          }

          // 2. 如果是配额不足 (StatusCode.HTTP_FORBIDDEN / QUOTA_EXHAUSTED)
          if (isQuotaError) {
             ui.showModal({
                 title: isChineseEnv ? '生成额度已用完' : 'Quota Exhausted',
                 content: isChineseEnv 
                    ? (err?.data?.message || StatusMessage[StatusCode.QUOTA_EXHAUSTED])
                    : 'Your resume generation quota has been used up. Please upgrade your plan or top-up points.',
                 confirmText: isChineseEnv ? '去升级' : 'Upgrade',
                 cancelText: isChineseEnv ? '取消' : 'Cancel',
                 success: (res) => {
                     if (res.confirm) {
                         const app = getApp<IAppOption>();
                         app.globalData.tabSelected = 2;
                         app.globalData.openMemberHubOnShow = true;
                         wx.reLaunch({
                             url: '/pages/main/index'
                         })
                     }
                 }
             })
             return;
          }

          ui.showModal({
            title: isChineseEnv ? '生成失败' : 'Generate Failed',
            content: err?.data?.message || err?.message || (isChineseEnv ? '系统繁忙，请稍后再试' : 'System busy, please try again later.'),
            showCancel: false
          })
        }
      } else {
        ui.hideLoading()
        this.setData({ isGenerating: false })
        
        const content = isChineseEnv 
          ? '为了生成效果，请先补全当前语言简历的基础资料（姓名、联系方式、教育及工作经历）。' 
          : 'Please complete your current language profile (Name, Contact, Education and Work Experience) first.'

        // 简历不完整，跳转到简历资料页
        ui.showModal({
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

    const res = await callApi<any>('saveJob', {
      jobId: job._id,
      type: job.type,
      createdAt: job.createdAt,
    })

    this.setData({ saveDocId: String(res.result?._id || '') })
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
      const res = await callApi<any>('checkJobSaved', { jobId: _id })
      const exists = !!res.result?.exists
      const updates: Partial<typeof this.data> = {
        saveDocId: String(res.result?._id || ''),
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

