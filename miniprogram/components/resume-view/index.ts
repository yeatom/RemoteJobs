// components/resume-view/index.ts

import { ui } from '../../utils/ui'
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
      title: t('resume.toolTitle'),
      subtitle: t('resume.toolSubtitle'),
      toolScreenshotTitle: t('resume.toolScreenshotTitle'),
      toolScreenshotDesc: t('resume.toolScreenshotDesc'),
      toolTextTitle: t('resume.toolTextTitle'),
      toolTextDesc: t('resume.toolTextDesc'),
      toolRefineTitle: t('resume.toolRefineTitle'),
      toolRefineDesc: t('resume.toolRefineDesc'),
      confirmGenerate: t('resume.confirmGenerate'),
      jdPlaceholder: t('resume.jdPlaceholder'),
      jobDescription: t('resume.jobDescription'),
      jobTitle: t('resume.jobTitle'),
      jobTitlePlaceholder: t('resume.jobTitlePlaceholder'),
      company: t('resume.company'),
      companyPlaceholder: t('resume.companyPlaceholder'),
      experience: t('resume.experience'),
      experiencePlaceholder: t('resume.experiencePlaceholder')
    },
    jdText: '', // Deprecated, keep for now if needed or remove
    showJdDrawer: false,
    drawerTitle: t('resume.toolTextTitle'),
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
        onLanguageRevive: () => {
          this.setData({
            ui: {
              title: t('resume.toolTitle'),
              subtitle: t('resume.toolSubtitle'),
              toolScreenshotTitle: t('resume.toolScreenshotTitle'),
              toolScreenshotDesc: t('resume.toolScreenshotDesc'),
              toolTextTitle: t('resume.toolTextTitle'),
              toolTextDesc: t('resume.toolTextDesc'),
              toolRefineTitle: t('resume.toolRefineTitle'),
              toolRefineDesc: t('resume.toolRefineDesc')
              ,
              confirmGenerate: t('resume.confirmGenerate'),
              jdPlaceholder: t('resume.jdPlaceholder'),
              jobDescription: t('resume.jobDescription'),
              jobTitle: t('resume.jobTitle'),
              jobTitlePlaceholder: t('resume.jobTitlePlaceholder'),
              company: t('resume.company'),
              companyPlaceholder: t('resume.companyPlaceholder'),
              experience: t('resume.experience'),
              experiencePlaceholder: t('resume.experiencePlaceholder')
            },
            drawerTitle: t('resume.toolTextTitle')
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
      const lang = normalizeLanguage(app.globalData.language)
        
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
      const app = getApp<any>()
      const lang = normalizeLanguage(app.globalData.language)
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
            source_name: targetJob.company || t('jobs.unknownCompany'),
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
        
        ui.showToast(t('jobs.featureDeveloping'))
    }
  }
})
