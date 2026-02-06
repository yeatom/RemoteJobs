import { ui } from '../../utils/ui'
import { t } from '../../utils/i18n/index'
import { attachLanguageAware } from '../../utils/languageAware'
import { requestGenerateResume } from '../../utils/resume'

Page({
  data: {
    ui: {
      title: '文字生成简历',
      subtitle: '完善以下信息，让 AI 更好地为您生成简历',
      jobTitle: '职位名称',
      jobTitlePlaceholder: '请输入职位名称',
      workYears: '工作年限',
      workYearsPlaceholder: '例如：3年',
      company: '公司 (选填)',
      companyPlaceholder: '请输入公司名称',
      jobDescription: '职位描述',
      jdPlaceholder: '粘贴职位描述或手动输入...',
    },
    targetJob: {
      title: '',
      company: '',
      experience: '',
      content: ''
    },
    isReady: false
  },

  onLoad(options: any) {
    this.initLanguage();
    
    // Allow passing initial data via query params or event channel
    if (options && options.title) {
        this.setData({
            'targetJob.title': decodeURIComponent(options.title || ''),
            'targetJob.company': decodeURIComponent(options.company || ''),
            'targetJob.content': decodeURIComponent(options.content || ''),
            'targetJob.experience': decodeURIComponent(options.experience || '')
        });
        this.validateForm();
    }
  },

  onUnload() {
    const that = this as any;
    if (that._langDetach) {
      that._langDetach();
    }
  },

  initLanguage() {
    const that = this as any;
    that._langDetach = attachLanguageAware(this, {
      onLanguageRevive: () => {
        this.setData({
          ui: {
            title: t('resume.toolTextTitle'),
            subtitle: t('resume.tips'),
            jobTitle: t('resume.jobTitle'),
            jobTitlePlaceholder: t('resume.jobTitlePlaceholder'),
            workYears: t('resume.experience'),
            workYearsPlaceholder: t('resume.experiencePlaceholder'),
            company: t('resume.company'),
            companyPlaceholder: t('resume.companyPlaceholder'),
            jobDescription: t('resume.jobDescription'),
            jdPlaceholder: t('resume.jdPlaceholder'),
          }
        });
      }
    });
  },

  onFieldChange(e: any) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`targetJob.${field}`]: value
    }, () => this.validateForm())
  },

  validateForm() {
    const { title, content, experience } = this.data.targetJob
    // Must have Job Title AND JD content AND Experience
    const hasTitle = !!(title && title.trim().length >= 1)
    const hasContent = !!(content && content.trim().length >= 5)
    const hasExperience = !!(experience && experience.trim().length >= 1)
    
    const isReady = hasTitle && hasContent && hasExperience
    if (isReady !== this.data.isReady) {
        this.setData({ isReady })
    }
  },

  handleSubmit() {
    // 1. Check validation state
    if (!this.data.isReady) {
      this.showMissingFieldsToast();
      return;
    }

    // 2. Haptic Feedback
    wx.vibrateShort({ type: 'medium' });

    // 3. API Call
    this.performGeneration()
      .then(() => {
        // 4. API Success! Show loading (min 2 seconds)
        ui.showLoading('生成中...', true);
        
        setTimeout(() => {
            ui.hideLoading();
            this.handleSuccess();
        }, 2000);
      })
      .catch((err: any) => {
        ui.hideLoading();
        // If it's a cancellation, don't show error modal
        if (err && err.message === 'User cancelled') {
            return;
        }
        this.handleError(err);
      });
  },

  performGeneration() {
      return new Promise((resolve, reject) => {
        const { targetJob } = this.data
        
        // Mock job_data structure
        const mockJobData = {
            _id: `CUSTOM_${Date.now()}`,
            _is_custom: true,
            title: targetJob.title,
            title_chinese: targetJob.title,
            title_english: targetJob.title,
            description: targetJob.content,
            experience: targetJob.experience,
            source_name: targetJob.company || t('jobs.unknownCompany', 'Chinese'),
            createdAt: new Date().toISOString()
        }

        requestGenerateResume(mockJobData, {
            showSuccessModal: false,
            onFinish: (success) => {
                if (success) {
                    resolve(true)
                } else {
                    reject(new Error('Generation failed'))
                }
            },
            onCancel: () => {
                reject(new Error('User cancelled'))
            }
        })
      });
  },

  showMissingFieldsToast() {
    const { title, content, experience } = this.data.targetJob
    let msg = '';
    
    if (!title || !title.trim()) {
        msg = t('resume.jobTitlePlaceholder');
    } else if (!experience || !experience.trim()) {
        msg = t('resume.experiencePlaceholder');
    } else if (!content || !content.trim()) {
        msg = t('resume.jdPlaceholder');
    }

    if (msg) {
        ui.showToast(msg); 
    }
  },

  handleSuccess() {
    // Navigate back
    wx.navigateBack();

    setTimeout(() => {
        wx.showModal({
            title: '开始生成',
            content: '简历正在后台生成中，要去看看进度吗？',
            confirmText: '去看看',
            cancelText: '稍后',
            success: (res) => {
                if (res.confirm) {
                    wx.navigateTo({ url: '/pages/generated-resumes/index' });
                }
            }
        });
    }, 300);
  },

  handleError(err: any) {
    wx.showModal({
      title: '调用失败',
      content: (err && err.message) || '未知错误，请重试',
      showCancel: false
    });
  }
})
