// miniprogram/components/job-detail/index.ts
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
  properties: {
    show: {
      type: Boolean,
      value: false,
    },
    jobId: {
      type: String,
      value: '',
    },
    collection: {
      type: String,
      value: '',
    },
  },

  data: {
    job: null as JobDetailItem | null,
    loading: false,
  },

  observers: {
    'show, jobId, collection'(show: boolean, jobId: string, collection: string) {
      if (show && jobId && collection) {
        this.fetchJobDetails(jobId, collection)
      } else if (!show) {
        // Reset when closing
        this.setData({
          job: null,
          loading: false,
        })
      }
    },
  },

  methods: {
    onClose() {
      this.triggerEvent('close')
    },

    async fetchJobDetails(id: string, collection: string) {
      this.setData({ loading: true })
      try {
        const db = wx.cloud.database()
        const res = await db.collection(collection).doc(id).get()
        
        // Process tags similar to index page
        const job = res.data as any
        const tags = (job.summary || '')
          .split(/[,，]/)
          .map((t: string) => t.trim().replace(/[。！!.,，、；;]+$/g, '').trim())
          .filter((t: string) => t && t.length > 1)

        const displayTags = [...tags]
        if (job.source_name && typeof job.source_name === 'string' && job.source_name.trim()) {
          const sourceTag = job.source_name.trim()
          if (displayTags.length >= 1) {
            displayTags.splice(1, 0, sourceTag)
          } else {
            displayTags.push(sourceTag)
          }
        }

        this.setData({
          job: {
            ...job,
            tags,
            displayTags,
          } as JobDetailItem,
          loading: false,
        })
      } catch (err) {
        console.error('[job-detail] fetchJobDetails failed', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
        this.setData({ loading: false })
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
  },
})

