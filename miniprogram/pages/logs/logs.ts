// miniprogram/pages/logs/logs.ts

Page({
  data: {
    isMaintenance: false,
    maintenanceMsg: '',
    title: '系统通知'
  },

  onLoad(options: any) {
    if (options.mode === 'maintenance') {
      const msg = options.msg ? decodeURIComponent(options.msg) : '系统维护中，请稍后再试'
      this.setData({
        isMaintenance: true,
        maintenanceMsg: msg,
        title: '系统维护'
      })
    }
  },

  onShow() {
    // Prevent leaving if in maintenance
    if (this.data.isMaintenance) {
      wx.hideHomeButton()
    }
  },

  onPullDownRefresh() {
    if (this.data.isMaintenance) {
      // Check if maintenance is over
      const app = getApp<IAppOption>() as any
      app.refreshSystemConfig().then(() => {
        const config = app.globalData.systemConfig
        if (config && !config.isMaintenance) {
          wx.reLaunch({ url: '/pages/index/index' })
        }
        wx.stopPullDownRefresh()
      })
    } else {
      wx.stopPullDownRefresh()
    }
  }
})
