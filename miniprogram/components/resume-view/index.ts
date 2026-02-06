// components/resume-view/index.ts

import { ui } from '../../utils/ui'
import { callApi } from '../../utils/request'
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'
import { checkIsAuthed } from '../../utils/util'
import { requestGenerateResume } from '../../utils/resume'

Component({
  properties: {
      active: {
          type: Boolean,
          value: false,
          observer(newVal) {
              if (newVal) {
                 this.onShowCompat()
              }
          }
      },
      isLoggedIn: {
          type: Boolean,
          value: false
      }
  },
  data: {
    isInitializing: true,
    ui: {
      title: '求职助手',
      subtitle: '让 AI 帮你搞定简历与面试',
      toolScreenshotTitle: '截图生成简历',
      toolScreenshotDesc: '上传岗位截图，AI 自动生成匹配简历',
      toolTextTitle: '文字生成简历',
      toolTextDesc: '粘贴文字，AI 自动生成匹配简历',
      toolRefineTitle: '简历润色',
      toolRefineDesc: '上传旧简历，AI 帮你重写升级'
      ,
      confirmGenerate: '生成',
      jdPlaceholder: '请粘贴完整的职位描述（JD）...',
      jobDescription: '岗位描述内容',
      jobTitle: '岗位标题',
      jobTitlePlaceholder: '例如：产品经理 / Java开发',
      company: '公司名称',
      companyPlaceholder: '可不填，用于生成简历名称',
      experience: '经验要求',
      experiencePlaceholder: '例:1-3年 (填0则ai不会额外生成工作经历)'
    },
    jdText: '', // Deprecated, keep for now if needed or remove
    showJdDrawer: false,
    drawerTitle: '文字生成简历',
    targetJob: {
      title: '',
      company: '',
      content: '',
      experience: ''
    },
    canSubmit: false
  },

  lifetimes: {
    attached() {
      ;(this as any)._langDetach = attachLanguageAware(this, {
        onLanguageRevive: (lang) => {
          this.setData({
            ui: {
              title: t('resume.toolTitle', lang),
              subtitle: t('resume.toolSubtitle', lang),
              toolScreenshotTitle: t('resume.toolScreenshotTitle', lang),
              toolScreenshotDesc: t('resume.toolScreenshotDesc', lang),
              toolTextTitle: t('resume.toolTextTitle', lang),
              toolTextDesc: t('resume.toolTextDesc', lang),
              toolRefineTitle: t('resume.toolRefineTitle', lang),
              toolRefineDesc: t('resume.toolRefineDesc', lang)
              ,
              confirmGenerate: t('resume.confirmGenerate', lang),
              jdPlaceholder: t('resume.jdPlaceholder', lang),
              jobDescription: t('resume.jobDescription', lang),
              jobTitle: t('resume.jobTitle', lang),
              jobTitlePlaceholder: t('resume.jobTitlePlaceholder', lang),
              company: t('resume.company', lang),
              companyPlaceholder: t('resume.companyPlaceholder', lang),
              experience: t('resume.experience', lang),
              experiencePlaceholder: t('resume.experiencePlaceholder', lang)
            },
            drawerTitle: t('resume.toolTextTitle', lang)
          });
        }
      });
    },
    detached() {
      if (typeof (this as any)._langDetach === 'function') {
        (this as any)._langDetach();
      }
    }
  },

  pageLifetimes: {
      show() {
          if (this.data.active) {
              this.onShowCompat()
          }
      }
  },

  methods: {
    onShowCompat() {
        const app = getApp<any>();
        
        // 同步全局选中的 Tab 索引，防止闪烁 (简历现在是 Index 1)
        if (app.globalData) {
            app.globalData.tabSelected = 1;
        }

        this.syncLoginState();
    },

    async syncLoginState() {
        const app = getApp<any>();
        
        // 等待全局 Auth 完成，防止状态闪烁
        if (app.globalData.userPromise) {
        await app.globalData.userPromise;
        }

        const user = app.globalData.user;
        const isLoggedIn = checkIsAuthed(user);

        this.setData({
        isLoggedIn,
        isInitializing: false
        });
    },

    onLoginSuccess() {
        this.setData({ isLoggedIn: true });
    },

    // Helper to ensure phone is bound before AI actions
    checkPhonePermission() {
        const app = getApp<any>()
        const user = app.globalData.user
      const lang = normalizeLanguage()
        
        if (!checkIsAuthed(user)) {
      ui.showModal({
        title: t('me.authRequiredTitle', lang),
        content: t('me.authRequiredContent', lang),
        confirmText: t('me.authRequiredConfirm', lang),
        showCancel: false,
        success: (res) => {
        if (res.confirm) {
          this.setData({ isLoggedIn: false });
        }
        }
      })
        return false
        }
        return true
    },

    openJdDrawer() {
        if (!this.checkPhonePermission()) return
      const lang = normalizeLanguage()
      this.setData({ 
      showJdDrawer: true,
      drawerTitle: t('resume.toolTextTitle', lang),
      targetJob: {
        title: '',
        company: '',
        content: '',
        experience: ''
      },
      canSubmit: false
      })
    },

    closeJdDrawer() {
        this.setData({ showJdDrawer: false })
    },

    onJdFieldChange(e: any) {
        const { field } = e.currentTarget.dataset
        const { value } = e.detail
        this.setData({
            [`targetJob.${field}`]: value
        }, () => this.validateForm())
    },

    validateForm() {
        const { title, content, experience } = this.data.targetJob
        // Must have Job Title AND JD content AND Experience
        const hasTitle = title && title.trim().length >= 2
        const hasContent = content && content.trim().length > 10
        const hasExperience = experience && experience.trim().length >= 1
        
        const valid = hasTitle && hasContent && hasExperience
        this.setData({ canSubmit: !!valid })
    },

    async onOptimizeKeywords(e: any) {
        if (!this.data.canSubmit) return

        const { targetJob } = this.data
        const { complete, fail } = e.detail;

        // Mock job_data for custom text generation
        const mockJobData = {
            _id: `CUSTOM_${Date.now()}`,
            title: targetJob.title,
            title_chinese: targetJob.title,
            title_english: targetJob.title,
            description: targetJob.content,
            experience: targetJob.experience,
            source_name: targetJob.company || '匿名公司',
            createdAt: new Date().toISOString()
        }

        await requestGenerateResume(mockJobData, {
            onFinish: (success) => {
                if (success) {
                    complete(true)
                } else {
                    fail()
                }
            },
            onCancel: () => {
                complete(false)
            }
        })
    },

    // --- Template Actions ---
    onTemplateTap() {
        if (!this.checkPhonePermission()) return

        wx.navigateTo({
        url: '/pages/resume-profile/index'
        })
    },

    onImportTap() {
        if (!this.checkPhonePermission()) return
        
        ui.showToast('功能开发中...')
    }
  }
})
