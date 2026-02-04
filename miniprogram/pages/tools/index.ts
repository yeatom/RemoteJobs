import { ui } from '../../utils/ui'
import { callApi } from '../../utils/request'
import { normalizeLanguage } from '../../utils/i18n'

interface IAppOption {
  globalData: {
    language: string;
  };
  refreshUser: () => Promise<any>;
}

Page({
  data: {
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

  openJdDrawer() {
    this.setData({ 
      showJdDrawer: true,
      drawerTitle: '文字生成简历',
      targetJob: {
        title: '',
        company: '',
        content: '',
        experience: ''
      }
    })
  },

  closeJdDrawer() {
    this.setData({ showJdDrawer: false })
  },

  onJdFieldChange(e: any) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    
    // Update data first
    this.setData({
      [`targetJob.${field}`]: value
    }, () => {
      // Check validation inside the callback to ensure data is updated
      this.checkSubmitStatus()
    })
  },

  checkSubmitStatus() {
    const { title, company, content, experience } = this.data.targetJob
    // Simple validation: all fields must have some content
    const isValid = !!(
      title && title.trim() && 
      company && company.trim() && 
      content && content.trim() && 
      experience && experience.trim()
    )
    
    if (this.data.canSubmit !== isValid) {
      this.setData({ canSubmit: isValid })
    }
  },

  // 1. 截图生成简历
  async onUploadScreenshot() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const filePath = res.tempFiles[0].tempFilePath
        ui.showLoading('AI 正在深度解析截图...')
        
        wx.uploadFile({
          url: 'https://feiwan.online/api/ocr',
          filePath: filePath,
          name: 'file',
          header: {
            'x-openid': wx.getStorageSync('user_openid') || ''
          },
          success: (uploadRes) => {
            ui.hideLoading()
            try {
              const result = JSON.parse(uploadRes.data)
              if (result.success && result.result) {
                const { title, company, experience, content } = result.result
                this.setData({
                  drawerTitle: '确认识别结果',
                  targetJob: {
                    title: title || '',
                    company: company || '',
                    experience: experience || '',
                    content: content || ''
                  },
                  showJdDrawer: true
                }, () => {
                  this.checkSubmitStatus()
                })
              } else {
                ui.showToast(result.message || '解析失败', 'none')
              }
            } catch (e) {
              ui.showToast('数据解析异常', 'none')
            }
          },
          fail: (err) => {
            ui.hideLoading()
            ui.showToast('上传失败，请重试', 'none')
          }
        })
      },
      fail: () => {
        // User cancelled
      }
    })
  },

  // 2. JD 关键词植入
  onInputJd(e: any) {
    this.setData({ jdText: e.detail.value })
  },

  async onOptimizeKeywords() {
    if (!this.data.canSubmit) return

    const { title, company, content, experience } = this.data.targetJob
    const app = getApp<IAppOption>()
    
    try {
      ui.showLoading('正在保存岗位信息...')
      
      // 1. 保存自定义岗位
      const saveRes: any = await callApi('saveCustomJob', {
        title,
        company,
        content,
        experience
      })

      if (!saveRes.success) {
        throw new Error(saveRes.message || '保存失败')
      }

      const { jobId, jobData } = saveRes.result
      
      // 2. 获取用户资料
      const user = await app.refreshUser()
      if (!user) {
        throw new Error('请先登录后操作')
      }

      const profile = user.resume_profile || {}
      const lang = normalizeLanguage(app.globalData.language)
      const isChineseEnv = (lang === 'Chinese' || lang === 'AIChinese')

      let aiProfile: any = {}
      if (isChineseEnv) {
        aiProfile = { ...profile.zh }
        // 补齐字段
        if (!aiProfile.name) throw new Error('简历资料不完整，请先前往“我”完善简历资料')
        aiProfile.en = profile.en
      } else {
        aiProfile = { ...profile.en }
        if (!aiProfile.name) throw new Error('Resume profile incomplete, please complete it in "Me" page first')
        aiProfile.zh = profile.zh
      }

      // 3. 调用生成接口
      // [Optimization] Removed clunky loading before API call
      const genRes: any = await callApi('generate', {
        jobId: jobId,
        openid: user.openid,
        resume_profile: aiProfile,
        job_data: jobData,
        language: isChineseEnv ? 'chinese' : 'english'
      })

      if (genRes.success) {
        ui.hideLoading()
        
        wx.showModal({
          title: isChineseEnv ? '生成任务已提交' : 'Task Submitted',
          content: isChineseEnv 
            ? 'AI 正在为你深度定制简历，预计需要 30 秒。完成后可在“生成记录”中查看。'
            : 'AI is customizing your resume. Check "Generated Resumes" in a few moments.',
          confirmText: isChineseEnv ? '去看看' : 'Check',
          cancelText: isChineseEnv ? '稍后再说' : 'Close',
          success: (modalRes) => {
            if (modalRes.confirm) {
              wx.navigateTo({
                url: '/pages/generated-resumes/index'
              })
            }
          }
        })
        
        // 成功后关闭当前抽屉并清空
        this.closeJdDrawer()
        this.setData({
          targetJob: { title: '', content: '', experience: '' },
          canSubmit: false
        })

        // 跳转到列表页
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/generated-resumes/index'
          })
        }, 1200)
      } else {
         throw new Error(genRes.message || '提交失败')
      }

    } catch (err: any) {
      ui.hideLoading()
      console.error('生成任务异常:', err)

      // Handle 409 Processing Error
      const isProcessingError = (err?.statusCode === 409) || (err?.data?.message && err.data.message.includes('生成中'));
      if (isProcessingError) {
        const lang = normalizeLanguage(getApp<IAppOption>().globalData.language)
        const isChineseEnv = (lang === 'Chinese' || lang === 'AIChinese')
        wx.showModal({
            title: isChineseEnv ? '生成中' : 'Processing',
            content: isChineseEnv 
              ? '定制简历还在生成中，请耐心等待，无需重复提交。' 
              : 'Resume is still being generated. Please wait.',
            showCancel: false,
            confirmText: isChineseEnv ? '知道了' : 'OK'
        });
        return;
      }

      ui.showError(err.message || '服务异常，请重试')
    }
  },

  // 3. 解析/润色旧简历
  async onRefineOldResume() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf', 'docx', 'doc'],
      success: async (res) => {
        ui.showLoading('简历润色中...')
        // Placeholder for parsing logic
        setTimeout(() => {
          ui.hideLoading()
          ui.showToast('功能开发中', 'none')
        }, 1500)
      },
      fail: () => {}
    })
  },

  onContactService() {
    wx.showActionSheet({
      itemList: ['复制专家微信号', '保存二维码'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.setClipboardData({
            data: 'YOUR_WECHAT_ID', // 请替换为实际微信号
            success: () => {
              ui.showToast('微信号已复制')
            }
          })
        } else if (res.tapIndex === 1) {
          // 这里可以展示二维码或保存图片
          // wx.previewImage({ urls: [...] })
          ui.showToast('请配置二维码', 'none')
        }
      }
    })
  }
})
