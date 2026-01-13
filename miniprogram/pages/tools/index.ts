import { ui } from '../../utils/ui'

Page({
  data: {
    jdText: '',
    showJdInput: false,
  },

  toggleJdInput() {
    this.setData({
      showJdInput: !this.data.showJdInput
    })
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
    if (!this.data.jdText) return ui.showError('请先输入目标 JD')
    ui.showLoading('关键词优化中...')
    // Placeholder for optimization logic
    setTimeout(() => {
      ui.hideLoading()
      ui.showToast('功能开发中', 'none')
    }, 1500)
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
