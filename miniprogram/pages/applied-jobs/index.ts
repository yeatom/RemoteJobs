// miniprogram/pages/applied-jobs/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'
import { toDateMs } from '../../utils/time'

Page({
  data: {
    appliedJobs: [] as any[],
    loading: false,
    emptyText: '暂无投递记录',
    loadingText: '加载中...',
    loadFailedText: '加载失败',
  },

  onLoad() {
    ;(this as any)._langDetach = attachLanguageAware(this, {
      onLanguageRevive: () => {
        this.updateLanguage()
        wx.setNavigationBarTitle({ title: '' })
      },
    })
  },

  onUnload() {
    const fn = (this as any)._langDetach
    if (typeof fn === 'function') fn()
    ;(this as any)._langDetach = null
  },

  onShow() {
    this.updateLanguage()
    this.loadAppliedJobs()
  },

  updateLanguage() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    this.setData({
      emptyText: lang === 'Chinese' || lang === 'AIChinese' ? '暂无投递记录' : 'No applied jobs',
      loadingText: t('jobs.loading', lang),
      loadFailedText: t('jobs.loadFailed', lang),
    })
  },

  async loadAppliedJobs() {
    const app = getApp<IAppOption>() as any
    const user = app?.globalData?.user
    const isLoggedIn = !!(user && (user.isAuthed || user.phone))

    if (!isLoggedIn) {
      this.setData({ appliedJobs: [] })
      return
    }

    this.setData({ loading: true })

    try {
      const db = wx.cloud.database()
      const openid = user?.openid

      if (!openid) {
        this.setData({ appliedJobs: [], loading: false })
        return
      }

      const result = await db.collection('applied_jobs')
        .where({
          user_id: openid,
        })
        .orderBy('applied_at', 'desc')
        .get()

      // 格式化日期
      const appliedJobs = (result.data || []).map((item: any) => {
        const appliedAt = item.applied_at
        let formattedDate = ''
        if (appliedAt) {
          const ms = toDateMs(appliedAt)
          if (ms) {
            const date = new Date(ms)
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            formattedDate = `${year}-${month}-${day} ${hours}:${minutes}`
          }
        }
        return {
          ...item,
          formattedAppliedAt: formattedDate,
        }
      })

      this.setData({
        appliedJobs,
        loading: false,
      })
    } catch (err) {
      console.error('加载投递记录失败:', err)
      this.setData({ loading: false })
      wx.showToast({
        title: this.data.loadFailedText,
        icon: 'none',
      })
    }
  },

  onJobTap(e: WechatMiniprogram.TouchEvent) {
    const jobId = e.currentTarget.dataset.jobId
    const jobData = e.currentTarget.dataset.jobData

    if (!jobId || !jobData) return

    // 保存到全局状态，跳转到详情页
    const app = getApp<IAppOption>() as any
    if (app?.globalData?._pageData) {
      app.globalData._pageData.jobData = jobData
    }

    wx.navigateTo({
      url: `/pages/job-detail/index?id=${jobId}`,
    })
  },
})

