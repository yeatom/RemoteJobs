// miniprogram/pages/job-detail/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
import { normalizeJobTags, translateFieldValue } from '../../utils/job'
import { attachLanguageAware } from '../../utils/languageAware'
import { processAndSaveAIResume } from '../../utils/resume'
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
        // 如果已有数据，重新处理显示
        if (this.data.job) {
          const app = getApp<IAppOption>() as any
          const lang = normalizeLanguage(app?.globalData?.language)
          const job = this.data.job
          const experience = (job as any).experience && typeof (job as any).experience === 'string' ? (job as any).experience.trim() : ''
          const { displayTags } = normalizeJobTags(job, lang, experience)
          const salary = job.salary && typeof job.salary === 'string' ? job.salary.trim() : ''
          const translatedSalary = translateFieldValue(salary, 'salary', lang)
          this.setData({
            job: {
              ...job,
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
    }, 200)
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
    
    try {
      wx.showLoading({ title: '检查中...', mask: true })
      // 实时请求数据库获取最新的完整度
      const user = await app.refreshUser()
      wx.hideLoading()
      
      const profile = user?.resume_profile || {}
      const completeness = user?.resume_completeness || 0

      if (completeness >= 1) {
        // 简历完整，调用云托管接口
        try {
          wx.showLoading({ title: 'AI 思考中...', mask: true })
          
          let aiProfile = { ...profile }
          
          // 如果有头像，换取临时链接，确保后端能跨环境访问
          if (profile.photo && profile.photo.startsWith('cloud://')) {
            try {
              const fileRes = await wx.cloud.getTempFileURL({
                fileList: [profile.photo]
              })
              if (fileRes.fileList && fileRes.fileList[0].tempFileURL) {
                aiProfile.photo = fileRes.fileList[0].tempFileURL
              }
            } catch (fileErr) {
              console.error('换取头像链接失败:', fileErr)
              // 失败了也继续，不影响文字生成
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
              jobId: this.data.job?._id,
              userId: user.openid,
              resume_profile: aiProfile,
              job_data: this.data.job
            },
            timeout: 60000
          })

          wx.hideLoading()
          
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
        } catch (err) {
          wx.hideLoading()
          console.error('调用云托管失败:', err)
          wx.showToast({ title: 'AI 服务暂时不可用', icon: 'none' })
        }
      } else {
        // 找出具体缺失的内容 (用于诊断)
        const missing = []
        if (!(profile.name && profile.photo && profile.gender && profile.birthday && profile.identity)) missing.push('基本信息')
        if (!(profile.wechat || profile.email || profile.phone)) missing.push('联系方式')
        if (!(profile.educations?.length > 0)) missing.push('教育经历')
        
        const content = missing.length > 0 
          ? `为了更好的生成效果，请完善: ${missing.join('、')}`
          : '为了更好的生成效果，请先完善简历资料'

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
      wx.hideLoading()
      console.error('检查完整度失败:', err)
      wx.showToast({ title: '检查失败，请重试', icon: 'none' })
    }
  },

  async onOneClickResumeSubmit() {
    const job = this.data.job
    if (!job) {
      wx.showToast({ title: this.data.dataLoadFailedText, icon: 'none' })
      return
    }

    // 检查认证状态
    const app = getApp<IAppOption>() as any
    const user = app?.globalData?.user
    const isVerified = !!(user && (user.isAuthed || user.phone))
    if (!isVerified) {
      this.closeApplyMenu()
      wx.showToast({ title: this.data.pleaseLoginText, icon: 'none' })
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
      wx.showLoading({ title: '投递中...', mask: true })

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

      wx.hideLoading()

      if (res?.result?.success) {
        wx.showToast({
          title: '投递成功',
          icon: 'success',
          duration: 2000,
        })
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
              wx.showToast({ title: '暂未接入付费流程', icon: 'none' })
            }
          },
        })
      } else {
        wx.showToast({
          title: res?.result?.message || '投递失败',
          icon: 'none',
        })
      }
    } catch (err: any) {
      wx.hideLoading()
      console.error('投递失败:', err)
      wx.showToast({
        title: '投递失败，请重试',
        icon: 'none',
      })
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

