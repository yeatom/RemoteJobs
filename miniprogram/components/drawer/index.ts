// miniprogram/components/drawer/index.ts
Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    userInfo: null as WechatMiniprogram.UserInfo | null,
    isLoggedIn: false,
  },

  methods: {
    onClose() {
      this.triggerEvent('close')
    },

    handleLogin() {
      if (this.data.isLoggedIn) return

      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          this.setData({
            userInfo: res.userInfo,
            isLoggedIn: true,
          })
        },
        fail: (err) => {
          console.error('[drawer] getUserProfile failed', err)
          wx.showToast({ title: '授权失败', icon: 'none' })
        },
      })
    },

    onOpenFavorites() {
      if (!this.data.isLoggedIn) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      wx.reLaunch({ url: '/pages/favorites/index' })
      this.onClose()
    },
  },
})
