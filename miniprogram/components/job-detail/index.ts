// miniprogram/components/job-detail/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
const swipeToClose = require('../../behaviors/swipe-to-close')

const SAVED_COLLECTION = 'saved_jobs'
const SAVE_DEBOUNCE_DELAY = 300

function formatDescription(description?: string): string {
  if (!description) return ''
  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  return description
    .split(/\n+/)
    .map((line) => {
      const content = escapeHtml(line.trim())
      return `<p>${content || '&nbsp;'}</p>`
    })
    .join('')
}

type JobDetailItem = {
  _id: string
  createdAt: string
  source_url: string
  salary: string
  source_name: string
  summary: string
  description?: string
  team: string
  title: string
  type: string
  tags: string[]
  displayTags?: string[]
}

Component({
  behaviors: [swipeToClose],

  properties: {
    show: {
      type: Boolean,
      value: false,
    },
    jobData: {
      type: Object,
      value: undefined,
    },
  },

  data: {
    job: null as JobDetailItem | null,
    loading: false,
    saved: false,
    saveBusy: false,
    saveDocId: '',
    isAIEnglish: false, // 是否为 AIEnglish 语言
    loadingText: '加载中...',
    loadFailedText: '加载失败',
    copyLinkText: '复制链接',
  },

  lifetimes: {
    attached() {
      const app = getApp<IAppOption>() as any
      const updateLanguage = () => {
        const lang = normalizeLanguage(app?.globalData?.language)
        this.setData({ 
          isAIEnglish: lang === 'AIEnglish',
          loadingText: t('jobs.loading', lang),
          loadFailedText: t('jobs.loadFailed', lang),
          copyLinkText: t('jobs.copyLink', lang),
        })
      }
      
      ;(this as any)._langListener = updateLanguage
      if (app?.onLanguageChange) app.onLanguageChange(updateLanguage)
      
      // 初始化
      updateLanguage()
    },

    detached() {
      const app = getApp<IAppOption>() as any
      const listener = (this as any)._langListener
      if (listener && app?.offLanguageChange) app.offLanguageChange(listener)
      ;(this as any)._langListener = null
    },
  },

  observers: {
    'show, jobData'(show: boolean, jobData: any) {
      if (show && jobData && jobData._id) {
        const currentId = (this.data.job as any)?._id
        const newId = jobData._id
        
        if (currentId === newId && this.data.job) {
          if (jobData.isSaved !== undefined && jobData.isSaved !== this.data.saved) {
            this.setData({ saved: jobData.isSaved })
          }
          return
        }
        
        if ((this as any)._animation && typeof (this as any)._animation.stop === 'function') {
          ;(this as any)._animation.stop()
          ;(this as any)._animation = null
        }
        
        const windowInfo = wx.getWindowInfo()
        const screenWidth = windowInfo.windowWidth
        
        this.setData({ 
          animationData: null,
          drawerTranslateX: screenWidth,
        })
        
        setTimeout(() => {
          if (this.data.show && this.data.jobData) {
            this.setData({ drawerTranslateX: 0 } as any)
          }
        }, 50)
        this.setJobFromData(jobData)
      } else if (!show) {
        if ((this as any)._animation && typeof (this as any)._animation.stop === 'function') {
          ;(this as any)._animation.stop()
          ;(this as any)._animation = null
        }
        
        const windowInfo = wx.getWindowInfo()
        const screenWidth = windowInfo.windowWidth
        this.setData({
          job: null,
          loading: false,
          saved: false,
          saveBusy: false,
          saveDocId: '',
          drawerTranslateX: screenWidth,
          animationData: null,
        })
      }
    },
  },

  methods: {
    async setJobFromData(jobData: any) {
      const _id = jobData._id
      if (!_id) return
      
      let displayTags = jobData.displayTags
      if (!displayTags || !Array.isArray(displayTags) || displayTags.length === 0) {
        const tags = (jobData.summary || '')
          .split(/[,，]/)
          .map((t: string) => t.trim().replace(/[。！!.,，、；;]+$/g, '').trim())
          .filter((t: string) => t && t.length > 1)

        displayTags = [...tags]
        // AIEnglish 时不插入 source_name 到 tags
        if (!this.data.isAIEnglish && jobData.source_name && typeof jobData.source_name === 'string' && jobData.source_name.trim()) {
          const sourceTag = jobData.source_name.trim()
          displayTags.push(sourceTag)
        }
      }

      const isSaved = jobData.isSaved !== undefined ? jobData.isSaved : null
      
      this.setData({
        job: {
          ...jobData,
          displayTags,
          richDescription: formatDescription(jobData.description),
        } as JobDetailItem & { richDescription: string },
        loading: false,
        saved: isSaved !== null ? isSaved : false,
      })

      if (isSaved === null) {
        try {
          const isSavedState = await this.checkSavedState(_id, true)
          this.setData({ saved: isSavedState })
        } catch (err) {
          this.setData({ saved: false })
        }
      }
    },

    onClose() {
      (this as any).closeDrawer()
    },

    async toggleSave() {
      const job = this.data.job
      if (!job || this.data.saveBusy) return

      // Product-level login check: phone authorized
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      const isLoggedIn = !!(user && (user.isAuthed || user.phone))
      if (!isLoggedIn) {
        wx.showToast({ title: '请先登录/绑定手机号', icon: 'none' })
        return
      }

      this.setData({ saveBusy: true })
      const targetSaved = !this.data.saved

      try {
        if (targetSaved) {
          await this.addSavedRecord(job)
        } else {
          await this.removeSavedRecord(job._id)
        }

        this.setData({ saved: targetSaved })
        
        this.triggerEvent('savechange', {
          _id: job._id,
          isSaved: targetSaved,
        })
        
        wx.showToast({
          title: targetSaved ? '收藏成功' : '已取消收藏',
          icon: 'none',
        })
      } catch (err) {
        wx.showToast({ title: '操作失败', icon: 'none' })
      } finally {
        setTimeout(() => {
          this.setData({ saveBusy: false })
        }, SAVE_DEBOUNCE_DELAY)
      }
    },


    onCopyLink() {
      if (!this.data.job?.source_url) return

      wx.setClipboardData({
        data: this.data.job.source_url,
        success: () => {
          wx.showToast({ title: '链接已复制', icon: 'success' })
        },
        fail: () => {
          wx.showToast({ title: '复制失败', icon: 'none' })
        },
      })
    },

    async addSavedRecord(job: JobDetailItem) {
      const app = getApp<IAppOption>() as any
      const openid = app?.globalData?.user?.openid
      if (!openid) throw new Error('missing openid')

      const db = wx.cloud.database()
      const recordData = {
        openid,
        jobId: job._id,
        type: job.type,
        createdAt: job.createdAt,
      }

      const result = await db.collection(SAVED_COLLECTION).add({ data: recordData })
      this.setData({ saveDocId: String((result as any)._id || '') })
    },

    async removeSavedRecord(_id: string) {
      const app = getApp<IAppOption>() as any
      const openid = app?.globalData?.user?.openid
      if (!openid) return

      const db = wx.cloud.database()
      let docId = this.data.saveDocId
      if (!docId) {
        const lookup = await db.collection(SAVED_COLLECTION).where({ openid, jobId: _id }).limit(1).get()
        docId = String((lookup.data?.[0] as any)?._id || '')
      }
      if (!docId) return
      await db.collection(SAVED_COLLECTION).doc(docId).remove()
      this.setData({ saveDocId: '' })
    },

    async checkSavedState(_id: string, silent = false) {
      if (!_id) return false

      const app = getApp<IAppOption>() as any
      const openid = app?.globalData?.user?.openid
      if (!openid) {
        if (!silent) this.setData({ saved: false, saveDocId: '' })
        return false
      }

      const db = wx.cloud.database()
      try {
        const res = await db.collection(SAVED_COLLECTION).where({ openid, jobId: _id }).limit(1).get()
        const doc = res.data?.[0] as any
        const exists = !!doc
        const updates: Partial<typeof this.data> = {
          saveDocId: String(doc?._id || ''),
        }
        if (!silent) updates.saved = exists
        this.setData(updates)
        return exists
      } catch (err) {
        if (!silent) {
          this.setData({ saved: false, saveDocId: '' })
        } else {
          this.setData({ saveDocId: '' })
        }
        return false
      }
    },
  },
})
