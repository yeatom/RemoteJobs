// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 初始化云开发（请把 env 替换为你的实际环境 ID）
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: require('./env.js').cloudEnv,
        traceUser: true,
      })
    }
  },
})