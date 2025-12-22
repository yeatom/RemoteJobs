// miniprogram/components/job-detail/index.ts
const COLLECT_COLLECTION = 'collected_jobs'
const COLLECT_DEBOUNCE_DELAY = 300

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
    collected: false,
    collectBusy: false,
    collectDocId: '',
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
          collected: false,
          collectBusy: false,
          collectDocId: '',
        })
      }
    },
  },

  methods: {
    onClose() {
      this.triggerEvent('close')
    },

    async toggleCollect() {
      const job = this.data.job
      if (!job || this.data.collectBusy) return

      this.setData({ collectBusy: true })
      const targetCollected = !this.data.collected

      try {
        if (targetCollected) {
          await this.addCollectRecord(job)
        } else {
          await this.removeCollectRecord(job._id)
        }

        this.setData({ collected: targetCollected })
        wx.showToast({
          title: targetCollected ? '收藏成功' : '已取消收藏',
          icon: 'none',
        })
      } catch (err) {
        console.error('[job-detail] toggleCollect failed', err)
        wx.showToast({ title: '操作失败', icon: 'none' })
      } finally {
        setTimeout(() => {
          this.setData({ collectBusy: false })
        }, COLLECT_DEBOUNCE_DELAY)
      }
    },

    async fetchJobDetails(id: string, collection: string) {
      this.setData({
        loading: true,
        job: null,
      })
      try {
        const db = wx.cloud.database()
        const collectStatePromise = this.checkCollectState(id, true)
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

        const isCollected = await collectStatePromise
        this.setData({
          job: {
            ...job,
            tags,
            displayTags,
            richDescription: formatDescription(job.description),
          } as JobDetailItem & { richDescription: string },
          loading: false,
          collected: isCollected,
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

    async addCollectRecord(job: JobDetailItem) {
      const db = wx.cloud.database()
      const recordData = {
        jobId: job._id,
        title: job.title,
        team: job.team,
        salary: job.salary,
        summary: job.summary,
        description: job.description,
        source_name: job.source_name,
        source_url: job.source_url,
        type: job.type,
        createdAt: job.createdAt,
      }

      const result = await db.collection(COLLECT_COLLECTION).add({ data: recordData })
      this.setData({ collectDocId: result._id || '' })
    },

    async removeCollectRecord(jobId: string) {
      const db = wx.cloud.database()
      let docId = this.data.collectDocId
      if (!docId) {
        const lookup = await db.collection(COLLECT_COLLECTION).where({ jobId }).limit(1).get()
        docId = lookup.data?.[0]?._id || ''
      }
      if (!docId) return
      await db.collection(COLLECT_COLLECTION).doc(docId).remove()
      this.setData({ collectDocId: '' })
    },

    async checkCollectState(jobId: string, silent = false) {
      if (!jobId) return false
      const db = wx.cloud.database()
      try {
        const res = await db.collection(COLLECT_COLLECTION).where({ jobId }).limit(1).get()
        const doc = res.data?.[0]
        const exists = !!doc
        const updates: Partial<typeof this.data> = {
          collectDocId: doc?._id || '',
        }
        if (!silent) updates.collected = exists
        this.setData(updates)
        return exists
      } catch (err) {
        if (!silent) {
          this.setData({ collected: false, collectDocId: '' })
        } else {
          this.setData({ collectDocId: '' })
        }
        console.warn('[job-detail] checkCollectState failed', err)
        return false
      }
    },
  },
})
