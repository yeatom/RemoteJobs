// components/resume-view/index.ts

import { ui } from '../../utils/ui'
import { normalizeLanguage, t, type AppLanguage } from '../../utils/i18n/index'
import { attachLanguageAware } from '../../utils/languageAware'
import { attachThemeAware } from '../../utils/themeAware'
import { themeManager } from '../../utils/themeManager'
import { checkIsAuthed } from '../../utils/util'
import { requestGenerateResume, showGenerationSuccessModal, startBackgroundTaskCheck } from '../../utils/resume'
import { callApi, uploadApi } from '../../utils/request'
import { StatusCode } from '../../utils/statusCodes'

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
      refineRefineReminder: t('resume.refineRefineReminder'),
      screenshotReminder: t('resume.screenshotReminder')
    },
    showRefineDrawer: false,
    // Preview Modal State
    showPreviewModal: false,
    previewAction: 'refine' as 'refine' | 'screenshot', // Context for the preview modal
    previewType: 'image', // 'image' | 'pdf'
    previewPath: '',
    previewName: '',
    previewSize: 0,
    onboardingMode: false
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
              refineRefineReminder: t('resume.refineRefineReminder', lang),
              screenshotReminder: t('resume.screenshotReminder', lang),
              cursorColor: themeManager.getPrimaryColor()
            }
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

            if (app.globalData._openRefineOnShow) {
                app.globalData._openRefineOnShow = false;
                setTimeout(() => {
                    this.onRefineOldResume();
                }, 300);
            }

            if (app.globalData._triggerResumeImport) {
                app.globalData._triggerResumeImport = false;
                setTimeout(() => {
                    this.setData({ onboardingMode: true });
                    this.onSelectFromLocal();
                }, 300);
            }
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
        wx.navigateTo({
            url: '/pages/resume-generator/index'
        });
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
                   ui.showToast(t('resume.selectFileFailed'));
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
                   ui.showToast(t('resume.selectImageFailed'));
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
                title: t('resume.fileTooLarge'),
                content: t('resume.fileSizeExceededPrefix') + (file.size / 1024 / 1024).toFixed(2) + 'MB',
                showCancel: false,
                isAlert: true
            });
            return;
        }

        if (file.size < MIN_SIZE) {
            ui.showModal({
                title: t('resume.fileInvalid'),
                content: t('resume.fileEmptyOrTooSmall'),
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
                title: t('resume.formatNotSupported'),
                content: t('resume.supportedFormats'),
                showCancel: false,
                isAlert: true
            });
            return;
        }

        // Show Custom Preview Modal instead of standard modal
        this.closeRefineDrawer();
        this.setData({
            showPreviewModal: true,
            previewAction: 'refine',
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
        if (this.data.onboardingMode) {
            this.processOnboardingUpload(this.data.previewPath, this.data.previewName);
        } else if (this.data.previewAction === 'refine') {
            this.processUpload(this.data.previewPath, this.data.previewName);
        } else {
            this.processScreenshotUpload();
        }
    },

    async processOnboardingUpload(path: string, _name: string) {
        const app = getApp<any>();
        const lang = normalizeLanguage(app.globalData.language);
        ui.showLoading(t('resume.aiChecking', lang));
        
        try {
            // Step 1: Parse and Apply to Profile directly
            const res = await uploadApi<any>({
                url: '/resume/apply-parsed',
                filePath: path,
                name: 'file'
            });

            ui.hideLoading();
            this.setData({ onboardingMode: false });

            if (res.success) {
                // Update global user data
                if (res.result?.user) {
                    app.globalData.user = res.result.user;
                }
                
                ui.showModal({
                    title: t('app.success', lang),
                    content: t('resume.onboardingSuccess', lang),
                    showCancel: false,
                    success: () => {
                        // Refresh current view (profile etc)
                        this.onShowCompat();
                    }
                });
            } else {
                this.handleUploadError(res, lang);
            }
        } catch (err: any) {
            ui.hideLoading();
            this.setData({ onboardingMode: false });
            this.handleUploadError(err, lang);
        }
    },

    handleUploadError(err: any, lang: string) {
        let errData = err.data;
        if (typeof errData === 'string') {
            try { errData = JSON.parse(errData); } catch(e){}
        }
        const code = (errData && errData.code) || err.code;

        if (err.statusCode === 401) {
            ui.showToast(t('resume.authFailedLogin', lang));
        } else if (code === StatusCode.QUOTA_EXHAUSTED) {
            ui.showModal({
                title: t('membership.quotaExceededTitle', lang),
                content: t('membership.quotaExceededContent', lang),
                showCancel: false,
                isAlert: true
            });
        } else if (code === StatusCode.INVALID_DOCUMENT_CONTENT || code === StatusCode.MISSING_IDENTITY_INFO) {
             ui.showModal({
                    title: t('resume.refineErrorTitle', lang) || '识别受阻',
                    content: t('resume.refineErrorContent', lang),
                    showCancel: false,
                    isAlert: true
            });
        } else {
            const msg = (errData && errData.message) || err.message || t('app.error', lang);
            ui.showToast(msg);
        }
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
                     ui.showToast(t('resume.cannotPreview'));
                 }
             })
        }
    },

    /* Deprecated: Replaced by Custom Preview Modal
    showConfirmUpload(path: string, fileName: string) {
        ...
    },
    */

    async processUpload(path: string, name: string) {
        const app = getApp<any>();
        const lang = normalizeLanguage(app.globalData.language);
        ui.showLoading(t('resume.aiChecking', lang));
        
        try {
            // Step 1: Parse the file to get profile data and detect language
            const data = await uploadApi<any>({
                url: '/resume/parse',
                filePath: path,
                name: 'file'
            });

            if (!data.success || !data.result) {
                ui.hideLoading();
                // Handle Logical Errors
                if (data.code === StatusCode.INVALID_DOCUMENT_CONTENT || data.code === StatusCode.MISSING_IDENTITY_INFO) { 
                    ui.showModal({
                        title: t('resume.refineErrorTitle', lang) || '识别受阻',
                        content: t('resume.refineErrorContent', lang),
                        showCancel: false,
                        isAlert: true
                    });
                } else if (data.code === StatusCode.QUOTA_EXHAUSTED) {
                    ui.showModal({
                        title: t('membership.quotaExceededTitle', lang) || '额度不足',
                        content: t('membership.quotaExceededContent', lang),
                        showCancel: false,
                        isAlert: true
                    });
                } else {
                    ui.showToast(data.message || t('app.error', lang));
                }
                return;
            }

            const extracted = data.result.profile;
            const detectedLang = data.result.language; // 'chinese' or 'english'

            // Step 2: Construct Dummy Job Data for "Polishing" flow
            const latestJob = (extracted.experience && extracted.experience[0]) || {};
            const targetTitle = latestJob.role || (extracted.name ? `${extracted.name}的简历` : "求职者");

            const dummyJob = {
                _id: `POLISH_${Date.now()}`,
                title: targetTitle,
                title_chinese: targetTitle,
                title_english: targetTitle,
                description: "通用简历润色与增强",
                experience: "3 years"
            };

            // Step 3: Map to internal profile structure (aligned with backend expectations)
            const overrideProfile: any = {
                name: extracted.name || "",
                gender: extracted.gender || "",
                phone: extracted.mobile || "",
                email: extracted.email || "",
                wechat: extracted.wechat || "",
                location: extracted.city || "",
                language: detectedLang, // Store detected language
                // Note: requestGenerateResume expects profile.zh or profile.en for completeness check
                // but since we are overriding, we'll bypass the deep completeness check structure
                is_override: true 
            };

            const mappedEducations = (extracted.education || []).map((e: any) => ({
                school: e.school || "",
                degree: e.degree || "",
                major: e.major || "",
                startDate: e.startTime || "",
                endDate: e.endTime || ""
            }));

            const mappedExperiences = (extracted.experience || []).map((e: any) => ({
                company: e.company || "",
                jobTitle: e.role || "",
                workContent: e.description || "",
                startDate: e.startTime || "",
                endDate: e.endTime || ""
            }));

            // Wrap based on detected lang to satisfy requestGenerateResume's completeness check
            if (detectedLang === 'english') {
                overrideProfile.en = { educations: mappedEducations, workExperiences: mappedExperiences, completeness: { level: 2 } };
                overrideProfile.zh = { educations: [], workExperiences: [], completeness: { level: 0 } };
            } else {
                overrideProfile.zh = { educations: mappedEducations, workExperiences: mappedExperiences, completeness: { level: 2 } };
                overrideProfile.en = { educations: [], workExperiences: [], completeness: { level: 0 } };
            }

            ui.hideLoading();

            // Step 4: Call Unified Generation Flow (This will show the language modal)
            const result = await requestGenerateResume(dummyJob, {
                overrideProfile,
                isPaid: true, // Mark as paid because /parse already cost 1pt
                showSuccessModal: true,
                waitForCompletion: false
            });

            if (result && typeof result === 'string') {
                 // Generation task started successfully, task_id returned
                 startBackgroundTaskCheck();
            }

        } catch (err: any) {
            ui.hideLoading();
            console.error('[Upload] Error:', err);
            
            // Parse error data from non-2xx response
            let errData = err.data;
            if (typeof errData === 'string') {
                try { errData = JSON.parse(errData); } catch(e){}
            }
            const code = (errData && errData.code);

            if (err.statusCode === 401) {
                ui.showToast(t('resume.authFailedLogin', lang));
            } else if (code === StatusCode.QUOTA_EXHAUSTED) { // Quota Exhausted (403)
                ui.showModal({
                    title: t('membership.quotaExceededTitle', lang) || '额度不足',
                    content: t('membership.quotaExceededContent', lang),
                    showCancel: false,
                    isAlert: true
                });
            } else if (code === StatusCode.INVALID_DOCUMENT_CONTENT || code === StatusCode.MISSING_IDENTITY_INFO) { // Identify/Content Error (403/400)
                 ui.showModal({
                        title: t('resume.refineErrorTitle', lang) || '识别受阻',
                        content: t('resume.refineErrorContent', lang),
                        showCancel: false,
                        isAlert: true
                });
            } else {
                const msg = (errData && errData.message) || err.message || t('app.error', lang);
                ui.showToast(msg);
            }
        }
    },

    async processScreenshotUpload() {
        const path = this.data.previewPath;
        const app = getApp<any>();
        const lang = normalizeLanguage(app.globalData.language);
        ui.showLoading(t('resume.aiChecking', lang));

        try {
            const data = await uploadApi<any>({
                url: '/parse-job-screenshot',
                filePath: path,
                name: 'file'
            });

            ui.hideLoading();

            if (data.success && data.result) {
                const { title, years, description } = data.result;

                // Fallback check on frontend (though backend validation catches most)
                if (!description || (years === undefined || years === null)) {
                    ui.showModal({
                        title: t('resume.missingJdOrExperience', lang),
                        content: t('resume.missingJdOrExperienceContent', lang),
                        showCancel: false,
                        isAlert: true
                    });
                    return;
                }

                // Navigate to the full page with parsed data
                wx.navigateTo({
                    url: `/pages/resume-generator/index?from=screenshot&title=${encodeURIComponent(title || '')}&years=${years}&content=${encodeURIComponent(description || '')}`
                });
            } else {
                // Handle Logical Errors (200 OK but success=false)
                if (data.code === StatusCode.INVALID_DOCUMENT_CONTENT || data.code === StatusCode.MISSING_IDENTITY_INFO) {
                    ui.showModal({
                        title: t('resume.refineErrorTitle', lang) || '识别受阻',
                        content: t('resume.parseJobErrorContent', lang),
                        showCancel: false,
                        isAlert: true
                    });
                } else if (data.code === StatusCode.QUOTA_EXHAUSTED) {
                    ui.showModal({
                        title: t('membership.quotaExceededTitle', lang) || '额度不足',
                        content: t('membership.quotaExceededContent', lang),
                        showCancel: false,
                        isAlert: true
                    });
                } else {
                    const errMsg = data.message || t('resume.parseJobFailed', lang);
                    ui.showToast(errMsg);
                }
            }
        } catch (err: any) {
            ui.hideLoading();
            console.error('[Screenshot Upload] Error:', err);

            let errData = err.data;
            if (typeof errData === 'string') {
                try { errData = JSON.parse(errData); } catch (e) { }
            }
            const code = (errData && errData.code);

            if (err.statusCode === 401) {
                ui.showToast(t('resume.authFailedLogin', lang));
            } else if (code === StatusCode.QUOTA_EXHAUSTED) {
                ui.showModal({
                    title: t('membership.quotaExceededTitle', lang) || '额度不足',
                    content: t('membership.quotaExceededContent', lang),
                    showCancel: false,
                    isAlert: true
                });
            } else if (code === StatusCode.INVALID_DOCUMENT_CONTENT || code === StatusCode.MISSING_IDENTITY_INFO) {
                ui.showModal({
                    title: t('resume.refineErrorTitle', lang) || '识别受阻',
                    content: t('resume.parseJobErrorContent', lang),
                    showCancel: false,
                    isAlert: true
                });
            } else {
                const errMsg = (errData && errData.message) || err.message || t('resume.parseJobFailed', lang);
                ui.showToast(errMsg);
            }
        }
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

    // Unified action name matching WXML
    onUploadScreenshot() {
        if (!this.checkPhonePermission()) return;
        
        // Level Check: Must be VIP (>0) or have sufficient points? 
        // User request: "Check level > 0"
        const app = getApp<any>();
        const level = app.globalData.user?.membership?.level || 0;
        const lang = normalizeLanguage(app.globalData.language);

        if (level <= 0) {
            ui.showModal({
                title: t('membership.quotaExceededTitle', lang) || '需要升级会员',
                content: '该功能仅限会员使用，请前往会员中心升级。', 
                showCancel: true,
                confirmText: t('membership.viewDetails', lang),
                success: (res) => {
                    if (res.confirm) {
                         wx.navigateTo({ url: '/pages/membership/index' });
                    }
                }
            });
            return;
        }

        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success: async (res) => {
                const tempFilePath = res.tempFiles[0].tempFilePath;
                const fileSize = res.tempFiles[0].size;
                const MAX_SIZE = 10 * 1024 * 1024; // 10MB
                const MIN_SIZE = 100; // 100 Bytes

                // 1. Size Validation (Frontend)
                if (fileSize > MAX_SIZE) {
                    ui.showModal({
                        title: t('resume.fileTooLarge', lang),
                        content: t('resume.fileSizeExceededPrefix', lang) + (fileSize / 1024 / 1024).toFixed(2) + 'MB',
                        showCancel: false,
                        isAlert: true
                    });
                    return;
                }

                if (fileSize < MIN_SIZE) {
                     ui.showModal({
                        title: t('resume.fileInvalid', lang) || '无效文件',
                        content: t('resume.fileEmptyOrTooSmall', lang),
                        showCancel: false,
                        isAlert: true
                    });
                    return;
                }

                // Show Preview Modal instead of proceeding directly
                this.setData({
                    showPreviewModal: true,
                    previewAction: 'screenshot',
                    previewPath: tempFilePath,
                    previewName: 'screenshot.jpg',
                    previewSize: fileSize,
                    previewType: 'image'
                });
            },
            fail: (err) => {
                if (err.errMsg.indexOf('cancel') === -1) {
                    ui.showToast(t('resume.selectImageFailed', lang));
                }
            }
        });
    },

    onImportTap() {
        if (!this.checkPhonePermission()) return
        
        ui.showToast(t('jobs.featureDeveloping'))
    }
  }
})
