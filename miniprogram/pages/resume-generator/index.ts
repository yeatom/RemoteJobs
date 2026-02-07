import { ui } from '../../utils/ui'
import { t } from '../../utils/i18n/index'
import { attachLanguageAware } from '../../utils/languageAware'
import { attachThemeAware } from '../../utils/themeAware'
import { themeManager } from '../../utils/themeManager'
import { requestGenerateResume, showGenerationSuccessModal, waitForTask } from '../../utils/resume'

const DRAFT_STORAGE_KEY = 'resume_generator_draft';

Page({
  data: {
    // ... data properties
    parsedData: null as any, // Flag to indicate if data came from screenshot
    ui: {
      title: '',
      subtitle: '',
      jobTitle: '',
      jobTitlePlaceholder: '',
      workYears: '',
      workYearsPlaceholder: '',
      jobDescription: '',
      jdPlaceholder: '',
    },
    targetJob: {
      title: '',
      experience: '',
      content: ''
    },
    isPaid: false,
    aiMessage: '',
    experienceRange: [] as string[],
    experienceIndex: 0,
    tempExperienceIndex: [0], // picker-view value is an array
    showExperiencePicker: false,
    
    // 校验状态: 'valid' | 'invalid' | ''
    validation: {
      title: '',
      experience: '',
      content: '',
      aiMessage: 'valid' // 默认有效
    },
    shakeField: '', // 触发抖动的字段名
    isReady: false
  },
  
  isSubmitting: false,

  onLoad(options: any) {
    this.initUIStrings();
    
    // attach language-aware behavior
    ;(this as any)._langDetach = attachLanguageAware(this, {
      onLanguageRevive: () => {
        this.initUIStrings()
      },
    })

    // attach theme-aware behavior
    ;(this as any)._themeDetach = attachThemeAware(this, {
      onThemeChange: () => {
        this.initUIStrings()
      },
    })

    // Check for draft if no explicit options provided
    if (Object.keys(options).length === 0) {
      // Try EventChannel
      const eventChannel = this.getOpenerEventChannel();
      // Check if eventChannel exists and has the method (in case opened directly)
      if (eventChannel && typeof eventChannel.on === 'function') {
        eventChannel.on('acceptDataFromOpenerPage', (data: any) => {
            if (data) {
                this.initializeWithData(data);
            }
        });
      } else {
         this.checkDraft();
      }
    } else if (options && options.title) {
        // Fallback for URL params
        this.initializeWithData(options);
    } else {
        this.checkDraft();
    }
  },

  initializeWithData(options: any) {
      let experience = decodeURIComponent(options.experience || '');
      // Handle direct years number passing (from EventChannel or processed options)
      if (!experience && options.years !== undefined && options.years !== null) {
        const yearSuffix = t('resume.year') || '年';
        const y = parseInt(options.years, 10);
        if (!isNaN(y)) {
          experience = `${y}${yearSuffix}`;
        }
      }

      this.setData({
        'targetJob.title': decodeURIComponent(options.title || ''),
        'targetJob.content': decodeURIComponent(options.content || ''),
        'targetJob.experience': experience,
        isPaid: options.from === 'screenshot',
        parsedData: options.from === 'screenshot' ? { from: 'screenshot' } : null
      }, () => {
        // 如果有传入经验，尝试匹配 picker index
        if (this.data.targetJob.experience) {
          let range = this.data.experienceRange;
          // Fallback if range not yet set by async initUIStrings
          if (!range || range.length === 0) {
             const yearSuffix = t('resume.year') || '年';
             range = Array.from({ length: 50 }, (_, i) => `${i + 1}${yearSuffix}`);
          }

          const idx = range.findIndex(item => item === this.data.targetJob.experience);
          if (idx >= 0) {
            this.setData({ 
              experienceIndex: idx,
              tempExperienceIndex: [idx]
            });
          }
        }
        this.validateAllFields();
      });
  },

  validateAllFields() {
    ['title', 'experience', 'content', 'aiMessage'].forEach(field => this.validateField(field));
  },

  initUIStrings() {
    const yearSuffix = t('resume.year') || '年';
    this.setData({
      experienceRange: Array.from({ length: 50 }, (_, i) => `${i + 1}${yearSuffix}`),
      'ui.title': t('resume.toolTextTitle') || '文字生成简历',
      'ui.subtitle': t('resume.tips') || '完善以下信息，让 AI 更好地为您生成简历',
      'ui.jobTitle': t('resume.jobTitle') || '职位名称',
      'ui.jobTitlePlaceholder': t('resume.jobTitlePlaceholder') || '请输入职位名称',
      'ui.workYears': t('resume.targetExperience') || '目标岗位年限',
      'ui.workYearsPlaceholder': t('resume.selectExperience') || '请选择年限',
      'ui.jobDescription': t('resume.jobDescription') || '职位描述',
      'ui.jdPlaceholder': t('resume.jdPlaceholder') || '粘贴职位描述或手动输入...',
      'ui.aiMessageLabel': t('resume.aiMessageLabel') || '想对 AI 说的话',
      'ui.aiMessagePlaceholder': t('resume.aiMessagePlaceholder') || '给 AI 的提示词...',
      'ui.syncFromProfile': t('resume.syncFromProfile') || '与简历资料同步',
      'ui.confirmGenerate': t('resume.confirmGenerate') || '生成简历',
      'ui.confirm': t('resume.confirm') || '确定',
      'ui.cursorColor': themeManager.getPrimaryColor(),
      aiMessage: this.data.aiMessage || t('resume.aiMessageDefault')
    });
  },

  onFieldChange(e: any) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value

    if (field === 'aiMessage') {
      this.setData({ aiMessage: value }, () => {
        this.validateField('aiMessage');
        this.saveDraft();
      });
    } else {
      this.setData({
        [`targetJob.${field}`]: value
      }, () => {
        this.validateField(field);
        this.saveDraft();
      });
    }
  },

  openExperiencePicker() {
    this.setData({ 
      showExperiencePicker: true,
      tempExperienceIndex: [this.data.experienceIndex]
    });
  },

  closeExperiencePicker() {
    this.setData({ showExperiencePicker: false });
  },

  onExperiencePickerChange(e: any) {
    this.setData({ tempExperienceIndex: e.detail.value });
  },

  onExperienceConfirm() {
    const index = this.data.tempExperienceIndex[0];
    const value = this.data.experienceRange[index];
    this.setData({
      experienceIndex: index,
      'targetJob.experience': value,
      showExperiencePicker: false
    }, () => {
      this.validateField('experience');
      this.saveDraft();
    });
  },

  onExperienceChange() {
    // Deprecated by custom picker confirm
  },

  onSyncResume() {
    // 模拟从简历同步逻辑，这里简单恢复默认提示词，或者可以从 globalData 读取简历信息拼接
    // 实际项目中可以读取 app.globalData.userProfile 等
    this.setData({ aiMessage: t('resume.syncResumeTip') || "与简历资料同步：请根据我的简历重点突出与该职位匹配的经历..." }, () => {
      this.validateField('aiMessage');
      ui.showToast(t('resume.syncedMessage') || '已同步简历提示词');
    });
  },

  validateField(field: string) {
    const { targetJob, aiMessage } = this.data;
    let isValid = false;
    let isInvalid = false;

    // Helper to calculate length (Chinese=1, English=0.5 based on requirements)
    // Req: Title >= 2 CN (4 EN), no uncommon special chars, NOT all numbers/punc
    // Req: Content >= 10 CN (20 EN), NOT all numbers/punc
    // Req: AI Message <= 500 CN (1000 EN), NOT all numbers/punc
    const getLen = (str: string) => {
      let len = 0;
      for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) > 127 || str.charCodeAt(i) === 94) {
          len += 1;
        } else {
          len += 0.5;
        }
      }
      return len;
    };

    const isNotEmptyOrPunc = (str: string) => {
      // Must contain at least one Chinese character or English letter
      return /[a-zA-Z\u4e00-\u9fa5]/.test(str);
    };

    if (field === 'title') {
      const len = getLen(targetJob.title);
      const isCommonChars = /^[a-zA-Z0-9\u4e00-\u9fa5\s\-\(\)\/]+$/.test(targetJob.title);
      if (len >= 2 && isCommonChars && isNotEmptyOrPunc(targetJob.title)) isValid = true;
      
      if (len > 50 || (targetJob.title.length > 0 && (!isCommonChars || !isNotEmptyOrPunc(targetJob.title)))) isInvalid = true;
    } 
    else if (field === 'experience') {
      // Experience: Selected
      if (targetJob.experience) isValid = true;
    } 
    else if (field === 'content') {
      const len = getLen(targetJob.content);
      if (len >= 10 && isNotEmptyOrPunc(targetJob.content)) isValid = true;
      if (len > 2500 || (targetJob.content.length > 0 && len >= 10 && !isNotEmptyOrPunc(targetJob.content))) isInvalid = true;
    } 
    else if (field === 'aiMessage') {
      const len = getLen(aiMessage);
      if (len <= 500 && (aiMessage.length === 0 || isNotEmptyOrPunc(aiMessage))) isValid = true;
      else isInvalid = true;
    }

    const validationState = isInvalid ? 'invalid' : (isValid ? 'valid' : '');
    
    this.setData({
      [`validation.${field}`]: validationState
    }, () => this.checkFormValidity());
  },

  checkFormValidity() {
    const { validation } = this.data;
    const isReady = validation.title === 'valid' && 
                    validation.experience === 'valid' && 
                    validation.content === 'valid' && 
                    validation.aiMessage === 'valid';
    
    if (isReady !== this.data.isReady) {
      this.setData({ isReady });
    }
  },

  onDisabledTap() {
    // Find first invalid field
    const { validation } = this.data;
    const fields = ['title', 'experience', 'content', 'aiMessage'];
    let firstInvalid = fields.find(f => validation[f as keyof typeof validation] !== 'valid');

    if (firstInvalid) {
      // Trigger shake
      this.setData({ shakeField: firstInvalid });
      // Clear shake after animation
      setTimeout(() => {
        this.setData({ shakeField: '' });
      }, 300);
      
      // Haptic feedback
      wx.vibrateShort({ type: 'medium' });
    }
  },

  handleSubmit() {
    if (this.data.isReady && !this.isSubmitting) {
      this.isSubmitting = true;
      this.clearDraft();
      
      wx.vibrateShort({ type: 'medium' });

      const { targetJob, aiMessage } = this.data
    const mockJobData = {
      _id: `CUSTOM_${Date.now()}`,
      _is_custom: true,
      title: targetJob.title,
      title_chinese: targetJob.title,
      title_english: targetJob.title,
      description: targetJob.content,
      experience: targetJob.experience,
      ai_message: aiMessage,
      source_name: '自定义',
      createdAt: new Date().toISOString()
    }

    const startGeneration = async () => {
        const result = await requestGenerateResume(mockJobData, {
            isPaid: this.data.isPaid,
            showSuccessModal: false,
            waitForCompletion: true,
            // We handle finish manually
        });

        if (typeof result === 'string') {
            // Poll for task (using standard polling logic but blocking UI)
            // 'doNotExit' Loading is already shown by requestGenerateResume if waitForCompletion=true
            const success = await waitForTask(result);
            
            ui.hideLoading();
            this.isSubmitting = false;

            if (success) {
                this.handleSuccess();
            } else {
                this.handleError(new Error('生成失败'));
            }
        } else if (result === true) {
            // Some flows might have already finished or don't return taskId but success
            ui.hideLoading();
            this.isSubmitting = false;
            this.handleSuccess();
        } else {
            ui.hideLoading();
            this.isSubmitting = false;
        }
    };

    startGeneration();
    }
  },

  showMissingFieldsToast() {
    // Deprecated by onDisabledTap logic
  },

  handleSuccess() {
    this.clearDraft();
    wx.navigateBack({
      success: () => {
        setTimeout(() => {
          showGenerationSuccessModal();
        }, 500);
      }
    });
  },

  handleError(err: any) {
    this.isSubmitting = false;
    ui.showModal({
      title: t('resume.errorShort') || '提示',
      content: (err && err.message) || t('resume.saveFailed') || '系统繁忙，请重试',
      showCancel: false
    });
  },

  onHide() {
    this.saveDraft();
  },

  onUnload() {
    this.saveDraft();
    
    // Detach listeners
    const fn = (this as any)._langDetach
    if (typeof fn === 'function') fn()
    ;(this as any)._langDetach = null

    const themeFn = (this as any)._themeDetach
    if (typeof themeFn === 'function') themeFn()
    ;(this as any)._themeDetach = null
  },

  checkDraft() {
    const draft = wx.getStorageSync(DRAFT_STORAGE_KEY);
    if (draft && (draft.targetJob.title || draft.targetJob.content || draft.aiMessage !== (t('resume.aiMessageDefault') || ''))) {
      ui.showModal({
        title: t('resume.errorShort') || '提示',
        content: t('resume.draftContinue') || '上次有没写完的岗位信息，是否继续填写？',
        cancelText: t('resume.clear') || '清除',
        confirmText: t('resume.continue') || '继续',
        success: (res) => {
          if (res.confirm) {
            this.setData({
              targetJob: draft.targetJob,
              aiMessage: draft.aiMessage,
              experienceIndex: draft.experienceIndex || 0,
              tempExperienceIndex: [draft.experienceIndex || 0]
            }, () => this.validateAllFields());
          } else {
            this.clearDraft();
          }
        }
      });
    }
  },

  saveDraft() {
    if (this.isSubmitting) return;

    // Only save if there's actual content or non-default AI message
    const { targetJob, aiMessage, experienceIndex } = this.data;
    if (targetJob.title || targetJob.content || aiMessage !== (t('resume.aiMessageDefault') || '')) {
      wx.setStorageSync(DRAFT_STORAGE_KEY, {
        targetJob,
        aiMessage,
        experienceIndex
      });
    }
  },

  clearDraft() {
    wx.removeStorageSync(DRAFT_STORAGE_KEY);
  }
})



