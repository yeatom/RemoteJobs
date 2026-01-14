// miniprogram/pages/job-detail/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
import { normalizeJobTags, translateFieldValue } from '../../utils/job'
import { attachLanguageAware } from '../../utils/languageAware'
import { processAndSaveAIResume } from '../../utils/resume'
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
    oneClickApplyText: 'One-Click Apply',
    applyMenuTitle: 'Quick Apply',
    copySourceLinkText: 'Copy Source Link',
    aiResumeGenerateText: 'AI Resume Builder',
    oneClickSubmitResumeText: 'One-Click Apply with Resume',
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
      oneClickApplyText: lang === 'Chinese' || lang === 'AIChinese' ? '一键申请' : 'One-Click Apply',
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
      
      wx.showToast({
        title: targetSaved ? this.data.saveSuccessText : this.data.unsaveSuccessText,
        icon: 'none',
      })
    } catch (err) {
      wx.showToast({ title: this.data.operationFailedText, icon: 'none' })
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
      wx.showToast({ title: this.data.noSourceLinkText, icon: 'none' })
      return
    }
    this.closeApplyMenu()
    // 复制链接或打开链接
    wx.setClipboardData({
      data: job.source_url,
      success: () => {
        wx.showToast({ title: this.data.linkCopiedText, icon: 'success' })
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
      const db = wx.cloud.database()
      const existingRes = await db.collection('generated_resumes')
        .where({
          jobId: jobId,
          status: 'completed'
        })
        .limit(1)
        .get()

      if (existingRes.data && existingRes.data.length > 0) {
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

      // 只要有一方达到 60% (1) 或 100% (2) 就可以生成
      if (comp_cn >= 1 || comp_en >= 1) {
        // 简历完整，调用云托管接口
        try {
          // 这里的 aiProfile 为了兼容后端，可能需要选取其中一方，或者全部传过去
          // 考虑到目前大部分是海外岗位，优先采用英文侧数据，但同时附带中文侧作为参考
          let aiProfile: any = {}
          if (comp_en >= 1) {
            aiProfile = { ...profile.en }
            aiProfile.zh = profile.zh // 附带中文作为辅助参考
          } else {
            aiProfile = { ...profile.zh }
            aiProfile.en = profile.en
          }
          
          // 如果有头像，换取临时链接，确保后端能跨环境访问
          const photoUrl = aiProfile.photo || profile.zh?.photo || profile.en?.photo
          if (photoUrl && photoUrl.startsWith('cloud://')) {
            try {
              const fileRes = await wx.cloud.getTempFileURL({
                fileList: [profile.photo]
              })
              if (fileRes.fileList && fileRes.fileList[0].tempFileURL) {
                aiProfile.photo = fileRes.fileList[0].tempFileURL
              }
            } catch (fileErr) {
              console.error('换取头像链接失败:', fileErr)
            }
          }

          const res = await wx.cloud.callContainer({
            config: {
              env: cloudRunEnv
            },
            path: '/api/generate',
            header: {
              'X-WX-SERVICE': 'express-vyc1',
              'content-type': 'application/json'
            },
            method: 'POST',
            data: {
              jobId: this.data.job?._id, // 岗位 ID
              userId: user.openid,      // 用户 ID (OpenID)
              resume_profile: aiProfile, // 传处理后的资料
              job_data: this.data.job    // 传完整的岗位 JSON
            },
            timeout: 15000 // 15秒等待，专门为唤醒冷启动设计的阈值
          })

          ui.hideLoading()
          this.setData({ isGenerating: false })
          
          if (res.statusCode === 200 && res.data && (res.data as any).task_id) {
            const taskId = (res.data as any).task_id
            
            // 提示用户任务已提交
            wx.showModal({
              title: '生成请求已提交',
              content: 'AI 正在为你深度定制简历，大约需要 30 秒。完成后将在“我的简历”中展示，你可以继续浏览其他岗位。',
              confirmText: '去看看',
              cancelText: '留在本页',
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
          
          // 处理冷启动超时
          if (err.errMsg?.includes('timeout') || err.errCode === 102002) {
            wx.showModal({
              title: 'AI 正在准备中',
              content: '由于服务刚刚唤醒，AI 正在进行最后的热身。您可以稍等 10 秒后再次点击，或者直接前往“我的简历”列表查看。',
              confirmText: '去查看',
              cancelText: '知道了',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.navigateTo({ url: '/pages/generated-resumes/index' })
                }
              }
            })
          } else {
            console.error('调用云托管失败:', err)
            ui.showError('AI 服务暂时繁忙')
          }
        }
      } else {
        ui.hideLoading()
        this.setData({ isGenerating: false })
        
        // 检查具体缺什么（以中文侧或英文侧均可作为基础）
        const p_zh = profile.zh || {}
        const p_en = profile.en || {}
        
        const hasBasicZh = p_zh.name && (p_zh.email || p_zh.phone || p_zh.wechat) && (p_zh.educations?.length > 0) && (p_zh.workExperiences?.length > 0)
        const hasBasicEn = p_en.name && (p_en.email || p_en.phone || p_en.wechat) && (p_en.educations?.length > 0) && (p_en.workExperiences?.length > 0)

        const missing = []
        if (!p_zh.name && !p_en.name) missing.push(this.data.isStandardChinese || this.data.isAIChinese ? '姓名' : 'Name')
        if (!(p_zh.email || p_zh.phone || p_zh.wechat || p_en.email || p_en.phone || p_en.wechat)) missing.push(this.data.isStandardChinese || this.data.isAIChinese ? '联系方式' : 'Contact')
        if (!(p_zh.educations?.length > 0 || p_en.educations?.length > 0)) missing.push(this.data.isStandardChinese || this.data.isAIChinese ? '教育经历' : 'Education')
        if (!(p_zh.workExperiences?.length > 0 || p_en.workExperiences?.length > 0)) missing.push(this.data.isStandardChinese || this.data.isAIChinese ? '工作经历' : 'Experience')
        
        const content = missing.length > 0 
          ? `${this.data.isStandardChinese || this.data.isAIChinese ? '为了生成效果，请至少补全一份简历的' : 'To generate resume, please complete at least'}: ${missing.join('、')}`
          : (this.data.isStandardChinese || this.data.isAIChinese ? '请先完善简历资料（需包含姓名、联系方式、教育及工作经历）' : 'Please complete your profile (Name, Contact, Education, and Work)')

        // 简历不完整，跳转到简历资料页
        wx.showModal({
          title: '简历信息不完整',
          content: content,
          confirmText: '去完善',
          cancelText: '取消',
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

  async onOneClickResumeSubmit() {
    const job = this.data.job
    if (!job) {
      ui.showError(this.data.dataLoadFailedText)
      return
    }

    // 检查认证状态
    const app = getApp<IAppOption>() as any
    const user = app?.globalData?.user
    const isVerified = !!(user && (user.isAuthed || user.phone))
    if (!isVerified) {
      this.closeApplyMenu()
      ui.showError(this.data.pleaseLoginText)
      return
    }

    // 确保用户已初始化（确保有 openid）
    if (!user?.openid) {
      try {
        await app.refreshUser()
      } catch (err) {
        console.error('刷新用户信息失败:', err)
      }
    }

    this.closeApplyMenu()

    try {
      ui.showLoading('投递中...')

      const res: any = await wx.cloud.callFunction({
        name: 'submitResume',
        data: {
          job_id: job._id,
          job_title: job.title,
          job_data: {
            title: job.title,
            summary: job.summary,
            description: job.description,
            salary: job.salary,
            source_name: job.source_name,
            source_url: job.source_url,
            type: job.type,
            team: job.team,
            tags: job.tags,
          },
        },
      })

      ui.hideLoading()

      if (res?.result?.success) {
        ui.showSuccess('投递成功')
      } else if (res?.result?.alreadyApplied) {
        wx.showModal({
          title: '提示',
          content: res.result.message || '您已经投递过该岗位，请耐心等待，可以在"我"的页面查看',
          showCancel: false,
          confirmText: '知道了',
        })
      } else if (res?.result?.needUpgrade) {
        wx.showModal({
          title: '配额不足',
          content: res.result.message || '您的投递次数已用完，请升级会员',
          confirmText: '去升级',
          cancelText: '取消',
          success: (modalRes) => {
            if (modalRes.confirm) {
              // TODO: 跳转到会员购买页面
              ui.showError('暂未接入付费流程')
            }
          },
        })
      } else {
        ui.showError(res?.result?.message || '投递失败')
      }
    } catch (err: any) {
      ui.hideLoading()
      console.error('投递失败:', err)
      ui.showError('投递失败，请重试')
    }
  },

  async addSavedRecord(job: JobDetailItem) {
    const app = getApp<IAppOption>() as any
    const openid = app?.globalData?.user?.openid
    if (!openid) throw new Error('missing openid')

    const db = wx.cloud.database()
    const recordData = {
      openid,
      jobId: job._id,
      type: job.type,
      createdAt: job.createdAt,
    }

    const result = await db.collection(SAVED_COLLECTION).add({ data: recordData })
    this.setData({ saveDocId: String((result as any)._id || '') })
  },

  async removeSavedRecord(_id: string) {
    const app = getApp<IAppOption>() as any
    const openid = app?.globalData?.user?.openid
    if (!openid) return

    const db = wx.cloud.database()
    let docId = this.data.saveDocId
    if (!docId) {
      const lookup = await db.collection(SAVED_COLLECTION).where({ openid, jobId: _id }).limit(1).get()
      docId = String((lookup.data?.[0] as any)?._id || '')
    }
    if (!docId) return
    await db.collection(SAVED_COLLECTION).doc(docId).remove()
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

    const db = wx.cloud.database()
    try {
      const res = await db.collection(SAVED_COLLECTION).where({ openid, jobId: _id }).limit(1).get()
      const doc = res.data?.[0] as any
      const exists = !!doc
      const updates: Partial<typeof this.data> = {
        saveDocId: String(doc?._id || ''),
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

