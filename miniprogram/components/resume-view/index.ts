// components/resume-view/index.ts

import { ui } from '../../utils/ui'
import { normalizeLanguage, t, type AppLanguage } from '../../utils/i18n/index'
import { attachLanguageAware } from '../../utils/languageAware'
import { attachThemeAware } from '../../utils/themeAware'
import { themeManager } from '../../utils/themeManager'
import { checkIsAuthed } from '../../utils/util'
import { requestGenerateResume, showGenerationSuccessModal } from '../../utils/resume'

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
    showRefineDrawer: false,
    drawerTitle: t('resume.toolTextTitle'),
    targetJob: {
      title: '',
      company: '',
      content: '',
      experience: ''
    },
    canSubmit: false,
    // Preview Modal State
    showPreviewModal: false,
    previewType: 'image', // 'image' | 'pdf'
    previewPath: '',
    previewName: '',
    previewSize: 0
  },

  lifetimes: {
    attached() {
      ;(this as any)._langDetach = attachLanguageAware(this, {
        onLanguageRevive: (lang: AppLanguage) => {
          this.setData({
            ui: {
              title: t('resume.toolTitle', lang),
              subtitle: t('resume.toolSubtitle', lang),
              toolScreenshotTitle: t('resume.toolScreenshotTitle', lang),
              toolScreenshotDesc: t('resume.toolScreenshotDesc', lang),
              toolTextTitle: t('resume.toolTextTitle', lang),
              toolTextDesc: t('resume.toolTextDesc', lang),
              toolRefineTitle: t('resume.toolRefineTitle', lang),
              toolRefineDesc: t('resume.toolRefineDesc', lang),
              confirmGenerate: t('resume.confirmGenerate', lang),
              jdPlaceholder: t('resume.jdPlaceholder', lang),
              jobDescription: t('resume.jobDescription', lang),
              jobTitle: t('resume.jobTitle', lang),
              jobTitlePlaceholder: t('resume.jobTitlePlaceholder', lang),
              company: t('resume.company', lang),
              companyPlaceholder: t('resume.companyPlaceholder', lang),
              experience: t('resume.experience', lang),
              experiencePlaceholder: t('resume.experiencePlaceholder', lang),
              cursorColor: themeManager.getPrimaryColor()
            },
            drawerTitle: t('resume.toolTextTitle', lang)
          });
        }
      });

      // attach theme-aware behavior
      ;(this as any)._themeDetach = attachThemeAware(this, {
        onThemeChange: () => {
          this.setData({
            'ui.cursorColor': themeManager.getPrimaryColor()
          });
        }
      });
    },
    detached() {
      if (typeof (this as any)._langDetach === 'function') {
        (this as any)._langDetach();
      }
      if (typeof (this as any)._themeDetach === 'function') {
        (this as any)._themeDetach();
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
            _is_custom: true, // 标记为用户手动输入的简历生成
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

    // --- Resume Refine Actions ---
    onRefineOldResume() {
        if (!this.checkPhonePermission()) return;
        this.setData({ showRefineDrawer: true });
    },

    closeRefineDrawer() {
        this.setData({ showRefineDrawer: false });
    },

    onSelectFromChat() {
       wx.chooseMessageFile({
           count: 1,
           type: 'file', 
           extension: ['pdf', 'png', 'jpg', 'jpeg'],
           success: (res) => {
               const file = res.tempFiles[0];
               this.validateAndConfirm(file);
           },
           fail: (err) => {
               if (err.errMsg.indexOf('cancel') === -1) {
                   ui.showToast('选择文件失败');
               }
           }
       });
    },

    onSelectFromLocal() {
        wx.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            sourceType: ['album', 'camera'],
            success: (res: any) => {
                // Compatible with array return in newer lib, but tempFiles is standard now
                const file = res.tempFiles ? res.tempFiles[0] : { path: res.tempFilePaths[0], size: 2 * 1024 * 1024 }; 
                this.validateAndConfirm({
                    path: file.path,
                    size: file.size,
                    name: 'image.jpg'
                });
            },
           fail: (err) => {
               if (err.errMsg.indexOf('cancel') === -1) {
                   ui.showToast('选择图片失败');
               }
           }
        });
    },

    validateAndConfirm(file: { path: string, size: number, name: string }) {
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        const MIN_SIZE = 100; // 100 Bytes

        // 1. Size Validation
        if (file.size > MAX_SIZE) {
            ui.showModal({
                title: '文件过大',
                content: `文件大小不能超过 10MB。当前大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
                showCancel: false,
                isAlert: true
            });
            return;
        }

        if (file.size < MIN_SIZE) {
            ui.showModal({
                title: '文件无效',
                content: '文件过小或为空，请重新选择有效的文件。',
                showCancel: false,
                isAlert: true
            });
            return;
        }
        
        // 2. Format Validation
        const allowedExts = ['pdf', 'png', 'jpg', 'jpeg'];
        const ext = file.name.split('.').pop()?.toLowerCase();
        
        // If it's a chat file (has a real name), check extension strictly
        // For local images, we force name="image.jpg" so it passes, but wx.chooseImage ensures it's an image.
        if (ext && !allowedExts.includes(ext)) { 
             ui.showModal({
                title: '格式不支持',
                content: '仅支持 PDF, PNG, JPG, JPEG 格式的文件。',
                showCancel: false,
                isAlert: true
            });
            return;
        }

        // Show Custom Preview Modal instead of standard modal
        this.closeRefineDrawer();
        this.setData({
            showPreviewModal: true,
            previewPath: file.path,
            previewName: file.name,
            previewSize: file.size,
            previewType: ext === 'pdf' ? 'pdf' : 'image'
        });
    },

    onCancelPreview() {
        this.setData({ showPreviewModal: false });
    },

    onConfirmPreview() {
        this.setData({ showPreviewModal: false });
        this.processUpload(this.data.previewPath, this.data.previewName);
    },

    openPdfPreview() {
        if (this.data.previewType === 'pdf' && this.data.previewPath) {
             wx.openDocument({
                 filePath: this.data.previewPath,
                 showMenu: true,
                 success: function () {
                    console.log('PDF Preview Open');
                 },
                 fail: (err) => {
                     ui.showToast('无法预览文件');
                 }
             })
        }
    },

    /* Deprecated: Replaced by Custom Preview Modal
    showConfirmUpload(path: string, fileName: string) {
        ...
    },
    */

    processUpload(path: string, name: string) {
        ui.showLoading(t('resume.toolRefineTitle'));
        const token = wx.getStorageSync('token');
        const app = getApp<any>();
        const lang = normalizeLanguage(app.globalData.language);

        wx.uploadFile({
            url: 'https://feiwan.online/api/refine-resume',
            filePath: path,
            name: 'file',
            header: {
                'Authorization': `Bearer ${token}`
            },
            formData: {
                // You can add extra data here if needed
            },
            success: (res) => {
               ui.hideLoading();
               try {
                   const data = JSON.parse(res.data);
                   if (data.success) {
                       ui.showGenerationSuccessModal();
                   } else {
                       // Handle Specific Errors
                       if (data.code === 40002 || data.code === 40003) { 
                           ui.showModal({
                               title: '识别受阻',
                               content: data.message || '未识别到有效信息，请确保上传的简历包含姓名和联系方式。',
                               showCancel: false,
                               isAlert: true
                           });
                       } else if (data.code === 40302) {
                           ui.showModal({
                               title: '额度不足',
                               content: data.message || '您的生成额度已用完，请获取更多次数。',
                               showCancel: false,
                               isAlert: true
                           });
                       } else {
                           ui.showModal({ title: 'Error', content: data.message || 'Upload failed', showCancel: false, isAlert: true });
                       }
                   }
               } catch (e) {
                   ui.showToast('Upload failed');
               }
            },
            fail: (e) => {
                ui.hideLoading();
                ui.showToast('Upload error ' + e.errMsg);
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

    onTextResumeTap() {
        if (!this.checkPhonePermission()) return
        wx.navigateTo({
            url: '/pages/resume-generator/index'
        })
    },

    onImportTap() {
        if (!this.checkPhonePermission()) return
        
        ui.showToast(t('jobs.featureDeveloping'))
    }
  }
})
