// miniprogram/components/drawer/index.ts
Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
      observer(show: boolean) {
        if (show && !this.data.isLoggedIn) {
          this.setData({ loginDisabled: false })
        }
      },
    },
  },

  data: {
    userInfo: null as WechatMiniprogram.UserInfo | null,
    isLoggedIn: false,
    loginDisabled: false,
  },

  lifetimes: {
    attached() {
      const cachedUserInfo = wx.getStorageSync('userInfo') as WechatMiniprogram.UserInfo | undefined
      if (cachedUserInfo && cachedUserInfo.avatarUrl && cachedUserInfo.nickName) {
        this.setData({
          userInfo: cachedUserInfo,
          isLoggedIn: true,
        })
      }
    },
  },

  methods: {
    onClose() {
      this.triggerEvent('close')
    },

    handleLogin() {
      if (this.data.isLoggedIn || this.data.loginDisabled) return

      this.setData({ loginDisabled: true })
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          const { avatarUrl, nickName } = res.userInfo
          const userInfo = {
            avatarUrl,
            nickName,
          } as WechatMiniprogram.UserInfo

          wx.setStorageSync('userInfo', userInfo)
          this.setData({
            userInfo,
            isLoggedIn: true,
          })
        },
        fail: (err) => {
          console.error('[drawer] getUserProfile failed', err)
          wx.showToast({ title: '授权失败', icon: 'none' })
        },
        complete: () => {
          this.setData({ loginDisabled: false })
        },
      })
    },

    onNicknameTap() {
      if (!this.data.isLoggedIn) {
        this.handleLogin()
      }
    },

    onOpenFavorites() {
      if (!this.data.isLoggedIn) {
        this.handleLogin()
        return
      }
      wx.reLaunch({ url: '/pages/favorites/index' })
      this.onClose()
    },
  },
})
