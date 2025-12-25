// miniprogram/components/drawer/index.ts

Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
    },
    value: {
      type: Object,
      value: {
        salary: '全部',
        experience: '全部',
      },
    },
  },

  data: {
    tempValue: {
      salary: '全部',
      experience: '全部',
    },
    salaryOptions: ['全部', '3K以下', '3-5K', '5-10K', '10-20K', '20-50K', '50K以上'],
    experienceOptions: ['全部', '在校生', '应届生', '1年以内', '1-3年', '3-5年', '5-10年', '10年以上'],
  },

  observers: {
    show(open) {
      if (open) {
        const v = (this.properties && this.properties.value) || { salary: '全部', experience: '全部' }
        this.setData({
          tempValue: {
            salary: v.salary || '全部',
            experience: v.experience || '全部',
          },
        })
      }
    },
    value(v) {
      if (this.properties && this.properties.show) {
        const next = v || { salary: '全部', experience: '全部' }
        this.setData({
          tempValue: {
            salary: next.salary || '全部',
            experience: next.experience || '全部',
          },
        })
      }
    },
  },

  methods: {
    stopPropagation() {},

    onClose() {
      this.triggerEvent('close')
    },

    onPickSalary(e) {
      const value = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.value) || '全部'
      this.setData({ tempValue: { ...this.data.tempValue, salary: value } })
    },

    onPickExperience(e) {
      const value = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.value) || '全部'
      this.setData({ tempValue: { ...this.data.tempValue, experience: value } })
    },

    onReset() {
      const value = { salary: '全部', experience: '全部' }
      this.setData({ tempValue: value })
      this.triggerEvent('reset', { value })
    },

    onConfirm() {
      this.triggerEvent('confirm', { value: { ...this.data.tempValue } })
    },
  },
})
