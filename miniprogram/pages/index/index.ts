// index.ts - remote jobs list

type JobItem = {
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

// Map filter names to collection names
const collectionMap: { [key: string]: string } = {
  '国内': 'domestic_remote_jobs',
  '国外': 'abroad_remote_jobs',
  'web3': 'web3_remote_jobs',
}

Component({
  data: {
    jobs: <JobItem[]>[],
    filteredJobs: <JobItem[]>[],
    showFilter: false,
    currentFilter: '国内',
    filterOptions: ['国内', '国外', 'web3'],
    searchKeyword: '',
    pageSize: 15,
    loading: false,
    hasMore: true,
    lowerThreshold: 100,
    scrollTop: null as number | null,
    maxScrollTop: 0,
    showNoMore: false,
    isDragging: false,
    scrollViewHeight: 0, // scroll-view 的可视高度（px）
    lastLoadTime: 0, // 上次分页加载的时间戳，用于防抖
    isScrollable: true, // Controls if the scroll-view can scroll
    showDrawer: false, // Controls the visibility of the drawer
    showJobDetail: false, // Controls the visibility of the job detail drawer
    selectedJobId: '', // The ID of the selected job
    selectedCollection: '', // The collection name for the selected job

    isSearching: false, // Flag to differentiate between paginated loading and search
  },
  lifetimes: {
    attached() {
      this.setData({ searchKeyword: '' })
      this.getSystemAndUIInfo()
      this.loadJobs(true)
    },
  },
  methods: {
    async getSystemAndUIInfo() {
      try {
        const windowInfo = wx.getWindowInfo()
        // const deviceInfo = wx.getDeviceInfo()

        const lowerThreshold = windowInfo.windowHeight / 2
        this.setData({ lowerThreshold })
      } catch (err) {
        console.error('[jobs] getSystemInfo failed', err)
      }
    },

    getScrollViewHeight() {
      const query = wx.createSelectorQuery().in(this)
      query.select('.job-list').boundingClientRect((rect: any) => {
        if (rect && rect.height) {
          this.setData({ scrollViewHeight: rect.height })
        }
      }).exec()
    },

    onSearchInput(e: WechatMiniprogram.Input) {
      const keyword = (e.detail.value || '').trim()
      this.setData({ searchKeyword: keyword })

      // Debounce search
      const self = this as any
      if (self._searchTimer) {
        clearTimeout(self._searchTimer)
      }
      self._searchTimer = setTimeout(() => {
        if (keyword) {
          this.performCollectionSearch(keyword)
        } else {
          // When search is cleared, revert to the category view
          this.setData({ isSearching: false })
          this.loadJobs(true)
        }
      }, 400)
    },

    async performCollectionSearch(keyword: string) {
      this.setData({ loading: true, isSearching: true })
      try {
        const db = wx.cloud.database()
        const _ = db.command
        const collectionName = collectionMap[this.data.currentFilter] || 'domestic_remote_jobs'

        // Create a regex for case-insensitive search
        const searchRegex = db.RegExp({ regexp: keyword, options: 'i' })

        // Since we can't fetch all data at once, we'll fetch a large batch (up to 100)
        // for the search result. This is a limitation of client-side database queries.
        const res = await db.collection(collectionName).where(_.or([
          { title: searchRegex },
          { source_name: searchRegex },
        ])).orderBy('createdAt', 'desc').limit(100).get()

        const mappedJobs = this.mapJobs(res.data || [])

        this.setData({
          jobs: mappedJobs,
          filteredJobs: mappedJobs,
          hasMore: false, // No pagination for search results
          scrollTop: 0,
        }, () => {
          this.checkScrollability()
        })
      } catch (err) {
        console.error('[jobs] Collection search error', err)
        wx.showToast({ title: '搜索失败', icon: 'none' })
      } finally {
        this.setData({ loading: false })
      }
    },

    toggleFilter() {
      this.setData({ showFilter: !this.data.showFilter })
    },

    stopPropagation() {},

    async onSelectFilter(e: WechatMiniprogram.TouchEvent) {
      const value = e.currentTarget.dataset.value as string
      if (value === this.data.currentFilter) {
        this.setData({ showFilter: false })
        return
      }

      this.setData({
        currentFilter: value,
        showFilter: false,
        jobs: [],
        filteredJobs: [],
        scrollTop: 0,
        searchKeyword: '',
        isSearching: false,
      })

      await this.loadJobs(true)
    },

    // This function is now only for local filtering when not in search mode.
    // The search logic is handled by performCollectionSearch
    filterJobs() {
      if (this.data.isSearching) return

      const { jobs, searchKeyword } = this.data
      const keyword = (searchKeyword || '').toLowerCase()

      if (!keyword) {
        this.setData({ filteredJobs: jobs })
        return
      }

      const filtered = jobs.filter((job) => {
        const title = (job.title || '').toLowerCase()
        const sourceName = (job.source_name || '').toLowerCase()
        return title.indexOf(keyword) > -1 || sourceName.indexOf(keyword) > -1
      })

      this.setData({ filteredJobs: filtered }, () => {
        this.checkScrollability()
      })
    },

    async loadJobs(reset = false) {
      if (this.data.loading) return
      this.setData({ loading: true, isSearching: false })

      try {
        const db = wx.cloud.database()
        const { pageSize, currentFilter } = this.data
        const collectionName = collectionMap[currentFilter] || 'domestic_remote_jobs'
        const skip = reset ? 0 : this.data.jobs.length

        const res = await db
          .collection(collectionName)
          .orderBy('createdAt', 'desc')
          .skip(skip)
          .limit(pageSize)
          .get()
        
        const newJobs = this.mapJobs(res.data || [])
        const allJobs = reset ? newJobs : [...this.data.jobs, ...newJobs]

          this.setData({
          jobs: allJobs,
          filteredJobs: allJobs,
          hasMore: newJobs.length === pageSize,
        }, () => {
          this.checkScrollability()
        })
      } catch (e) {
        console.error('[jobs] loadJobs error', e)
        wx.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.setData({ loading: false })
      }
    },

    mapJobs(jobs: any[]): JobItem[] {
      return jobs.map((item: any) => {
        const tags = (item.summary || '')
          .split(/[,，]/)
          .map((t: string) => t.trim().replace(/[。！!.,，、；;]+$/g, '').trim())
          .filter((t: string) => t && t.length > 1)

        const displayTags = [...tags]
        if (item.source_name && typeof item.source_name === 'string' && item.source_name.trim()) {
          const sourceTag = item.source_name.trim()
          if (displayTags.length >= 1) {
            displayTags.splice(1, 0, sourceTag)
          } else {
            displayTags.push(sourceTag)
          }
        }

        return {
          ...item,
          tags,
          displayTags,
        } as JobItem
      })
    },

    maybeLoadMore() {
      if (this.data.isSearching) return

      const { loading, hasMore, lastLoadTime } = this.data
      const now = Date.now()
      if (loading || !hasMore || now - lastLoadTime < 500) return
      
      this.setData({ lastLoadTime: now })
      this.loadJobs(false)
    },

    onScrollLower() {
      this.maybeLoadMore()
    },

    onScroll(e: any) {
      const { scrollTop, scrollHeight } = e.detail
      const clientHeight = this.data.scrollViewHeight || e.detail.clientHeight || 0
      if (clientHeight === 0) this.getScrollViewHeight()

      const maxScroll = clientHeight > 0 ? Math.max(0, scrollHeight - clientHeight) : 0
      if (maxScroll > 0 && Math.abs(maxScroll - this.data.maxScrollTop) > 1) {
        this.setData({ maxScrollTop: maxScroll })
      }

      if (this.data.isScrollable && !this.data.hasMore && this.data.filteredJobs.length > 0 && maxScroll > 0) {
        const overScroll = scrollTop - maxScroll
        this.setData({ showNoMore: overScroll > 0 })
      }
    },

    onTouchStart() {
      this.setData({ isDragging: true })
    },

    onTouchEnd() {
      this.setData({ isDragging: false })
    },

    checkScrollability() {
      setTimeout(() => {
        const query = wx.createSelectorQuery().in(this)
        query.select('.job-list').boundingClientRect()
        query.select('.job-list-content').boundingClientRect()
        query.exec((res) => {
          if (res && res[0] && res[1]) {
            const containerHeight = res[0].height
            const contentHeight = res[1].height
            const isScrollable = contentHeight > containerHeight
            if (isScrollable !== this.data.isScrollable) {
              this.setData({ isScrollable })
            }
          }
        })
      }, 100)
    },

    toggleDrawer() {
      this.setData({ showDrawer: !this.data.showDrawer })
    },

    onJobTap(e: WechatMiniprogram.TouchEvent) {
      const _id = e.currentTarget.dataset._id as string;
      const collectionName = collectionMap[this.data.currentFilter] || 'domestic_remote_jobs';
      this.setData({
        selectedJobId: _id,
        selectedCollection: collectionName,
        showJobDetail: true,
      });
    },

    closeJobDetail() {
      this.setData({ showJobDetail: false });
    },
  },
})
