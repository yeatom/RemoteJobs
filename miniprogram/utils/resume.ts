// miniprogram/utils/resume.ts
import { ui } from './ui'
import { callApi } from './request'
import { normalizeLanguage, t } from './i18n'
import { StatusCode } from './statusCodes'

export interface ResumeGenerateOptions {
  onStart?: () => void
  onFinish?: (success: boolean) => void
  onCancel?: () => void
}

/**
 * 统一处理生成 AI 简历的业务流：刷新用户、校验完整度、构造数据、调用 API、处理异常、展示成功弹窗
 */
export async function requestGenerateResume(jobData: any, options: ResumeGenerateOptions = {}) {
  const app = getApp<any>()
  const lang = normalizeLanguage()
  const isChineseEnv = (lang === 'Chinese' || lang === 'AIChinese')
  
  if (options.onStart) options.onStart()

  try {
    // 1. 实时刷新用户以获取最新的简历完善度 (level)
    const user = await app.refreshUser()
    const profile = user?.resume_profile || {}
    
    const completeness = isChineseEnv 
      ? (profile.zh?.completeness || { level: 0, score: 0 }) 
      : (profile.en?.completeness || { level: 0, score: 0 });

    // 2. 简历完整度校验 (Backend: level >= 1 为达标，即 80%+)
    if (completeness.level < 1) {
      if (options.onFinish) options.onFinish(false)
      const score = completeness.score || 0
      
      ui.showModal({
        title: lang === 'English' ? 'Resume Incomplete' : '简历信息不完善',
        content: lang === 'English' 
          ? `Your current resume score is ${score}%. A higher score (80%+) ensures better AI matching. Do you want to improve it now?`
          : `您当前的简历完善度为 ${score}%。完善度达到 80% 以上能显著提升 AI 匹配效果。是否现在去完善？`,
        confirmText: lang === 'English' ? 'Go Improve' : '去完善',
        cancelText: lang === 'English' ? 'Generate Anyway' : '直接生成',
        success: async (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/resume-profile/index' })
            if (options.onCancel) options.onCancel()
          } else if (res.cancel) {
            // 用户选择“直接生成”
            doGenerate(user, profile, jobData, isChineseEnv, lang, options)
          } else {
             if (options.onCancel) options.onCancel()
          }
        }
      })
      return
    }

    // 3. 资料已达标，进入正式生成流程
    await doGenerate(user, profile, jobData, isChineseEnv, lang, options)

  } catch (err) {
    console.error('[ResumeService] Generation flow failed:', err)
    if (options.onFinish) options.onFinish(false)
    ui.showError(t('jobs.checkFailed', lang))
  }
}

/**
 * 执行实际的生成请求
 */
async function doGenerate(user: any, profile: any, job: any, isChineseEnv: boolean, lang: string, options: ResumeGenerateOptions) {
  try {
    // 构造 AI 生成所需的 Profile 数据，合并顶层字段与当前语言偏好
    let aiProfile: any = {
      ...profile,
      gender: user.gender,
      photo: user.avatar || profile.photo
    }
    
    const currentLangProfile = isChineseEnv ? (profile.zh || {}) : (profile.en || {})
    
    aiProfile = {
      ...aiProfile,
      ...currentLangProfile,
      // 确保数组字段存在
      workExperiences: currentLangProfile.workExperiences || profile.workExperiences || [],
      educations: currentLangProfile.educations || profile.educations || [],
      skills: currentLangProfile.skills || profile.skills || [],
      certificates: currentLangProfile.certificates || profile.certificates || [],
      zh: profile.zh,
      en: profile.en
    }

    const res = await callApi<any>('generate', {
      jobId: job._id,
      openid: user.openid,
      resume_profile: aiProfile,
      job_data: job,
      language: isChineseEnv ? 'chinese' : 'english'
    })

    if (res.success && res.result?.task_id) {
      if (options.onFinish) options.onFinish(true)
      
      // 展示统一的成功提效模态框
      ui.showModal({
        title: isChineseEnv ? '生成请求已提交' : 'Request Submitted',
        content: isChineseEnv 
          ? 'AI 正在为你深度定制简历，大约需要 30 秒。完成后将在“我的简历”中展示，你可以继续浏览其他岗位。'
          : 'AI is customizing your resume, usually takes 30s. Check "Generated Resumes" later.',
        confirmText: isChineseEnv ? '去看看' : 'Check',
        cancelText: isChineseEnv ? '留在本页' : 'Stay',
        success: (modalRes) => {
          if (modalRes.confirm) {
            wx.navigateTo({ url: '/pages/generated-resumes/index' })
          }
        }
      })
    } else {
      throw new Error('Service response error')
    }
  } catch (err: any) {
    console.error('[ResumeService] API call failed:', err)
    if (options.onFinish) options.onFinish(false)
    handleGenerateError(err, lang)
  }
}

/**
 * 统一处理生成过程中的业务错误（配额、并发等）
 */
function handleGenerateError(err: any, lang: string) {
  const isQuotaError = (err?.data?.code === StatusCode.QUOTA_EXHAUSTED) || (err?.statusCode === StatusCode.HTTP_FORBIDDEN) || (err?.data?.error === 'Quota exhausted');
  const isProcessingError = (err?.statusCode === StatusCode.HTTP_CONFLICT) || (err?.data?.message && err.data.message.includes('生成中'));

  if (isProcessingError) {
    ui.showModal({
      title: t('jobs.generatingTitle', lang),
      content: t('jobs.generatingContent', lang),
      showCancel: false,
      confirmText: t('jobs.generatingConfirm', lang)
    });
    return;
  }

  if (isQuotaError) {
    ui.showModal({
      title: t('jobs.quotaExhaustedTitle', lang),
      content: err?.data?.message || t('jobs.quotaExhaustedContent', lang),
      confirmText: t('jobs.quotaExhaustedConfirm', lang),
      cancelText: t('jobs.quotaExhaustedCancel', lang),
      success: (res) => {
        if (res.confirm) {
          const app = getApp<any>();
          app.globalData.tabSelected = 2;
          app.globalData.openMemberHubOnShow = true;
          wx.reLaunch({ url: '/pages/main/index' })
        }
      }
    })
    return;
  }

  ui.showModal({
    title: t('jobs.generateFailedTitle', lang),
    content: err?.data?.message || err?.message || t('jobs.generateFailedTitle', lang),
    showCancel: false
  })
}
