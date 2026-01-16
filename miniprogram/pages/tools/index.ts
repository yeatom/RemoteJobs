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
    targetJob: {
      title: '',
      content: '',
      experience: ''
    },
    canSubmit: false
  },

  openJdDrawer() {
    this.setData({ showJdDrawer: true })
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
    const { title, content, experience } = this.data.targetJob
    // Simple validation: all fields must have some content
    const isValid = !!(title && title.trim() && content && content.trim() && experience && experience.trim())
    
    if (this.data.canSubmit !== isValid) {
      this.setData({ canSubmit: isValid })
    }
  },

  // 1. 截图生成简历
  async onUploadScreenshot() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        ui.showLoading('AI 正在深度解析截图...')
        // Placeholder for cloud function logic
        setTimeout(() => {
          ui.hideLoading()
          ui.showToast('功能开发中', 'none')
        }, 1500)
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

    const { title, content, experience } = this.data.targetJob
    const app = getApp<IAppOption>()
    
    try {
      ui.showLoading('正在保存岗位信息...')
      
      // 1. 保存自定义岗位
      const saveRes: any = await callApi('saveCustomJob', {
        title,
        content,
        experience
      })

      if (!saveRes.success) {
        throw new Error(saveRes.message || '保存失败')
      }

      const { jobId, jobData } = saveRes.result
      
      ui.showLoading('准备 AI 生成...')
      
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
      ui.showLoading('正在连接 AI...', false)
      const genRes: any = await callApi('generate', {
        jobId: jobId,
        userId: user.openid,
        resume_profile: aiProfile,
        job_data: jobData,
        language: isChineseEnv ? 'chinese' : 'english'
      })

      if (genRes.success) {
        ui.hideLoading()
        ui.showSuccess('任务已提交')
        
        // 成功后关闭弹窗并清空
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
