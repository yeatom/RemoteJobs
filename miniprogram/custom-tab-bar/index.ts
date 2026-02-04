Component({
  data: {
    selected: 0,
    color: "#6b7280",
    selectedColor: "#1d4ed8",
    list: [
      {
        pagePath: "/pages/index/index",
        text: "岗位",
        iconPath: "/assets/tabbar/community.png",
        selectedIconPath: "/assets/tabbar/community-active.png"
      },
      {
        pagePath: "/pages/tools/index",
        text: "简历",
        iconPath: "/assets/tabbar/jobs.png",
        selectedIconPath: "/assets/tabbar/jobs-active.png"
      },
      {
        pagePath: "/pages/me/index",
        text: "我",
        iconPath: "/assets/tabbar/me.png",
        selectedIconPath: "/assets/tabbar/me-active.png"
      }
    ]
  },
  methods: {
    switchTab(e: any) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({url})
    }
  }
})
