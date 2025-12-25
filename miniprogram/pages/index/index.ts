// index.ts - remote jobs list

import type { JobItem } from '../../utils/job'
import { mapJobs, typeCollectionMap } from '../../utils/job'
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'

type FilterType = '国内' | '国外' | 'web3'

type DrawerFilterValue = {
  salary: string
  experience: string
}

const DEFAULT_DRAWER_FILTER: DrawerFilterValue = {
  salary: '全部',
  experience: '全部',
}

Page({
  data: {
    jobs: <JobItem[]>[],
    filteredJobs: <JobItem[]>[],
    showFilter: false,
    currentFilter: '国内' as FilterType,
    filterOptions: ['国内', '国外', 'web3'] as FilterType[],
    searchKeyword: '',
    pageSize: 15,
    loading: false,
    hasMore: true,
    lowerThreshold: 100,
    scrollTop: 0,
    scrollViewHeight: 0, // scroll-view 的可视高度（px）
    lastLoadTime: 0, // 上次分页加载的时间戳，用于防抖
    showDrawer: false, // Controls the visibility of the drawer
    showJobDetail: false, // Controls the visibility of the job detail drawer
    selectedJobId: '', // The ID of the selected job
    selectedCollection: '', // The collection name for the selected job

    isSearching: false, // Flag to differentiate between paginated loading and search

    drawerFilter: DEFAULT_DRAWER_FILTER as DrawerFilterValue,

    ui: {
      searchPlaceholder: '搜索职位名称或来源..',
      filterLabel: '筛选',
    } as Record<string, string>,

    displayCurrentFilter: '国内',
    displayFilterOptions: ['国内', '国外', 'web3'],
  },
  onLoad() {
    this.setData({ searchKeyword: '' })

    // attach language-aware behavior (nav title + UI strings)
    ;(this as any)._langDetach = attachLanguageAware(this, {
      onLanguageRevive: () => {
        this.syncLanguageFromApp()
        // Immediately set navigation bar title when language changes
        const app = getApp<IAppOption>() as any
        const lang = normalizeLanguage(app?.globalData?.language)
        wx.setNavigationBarTitle({ title: t('app.navTitle', lang) })
      },
    })

    this.getSystemAndUIInfo()
    this.loadJobs(true)
  },

  onUnload() {
    const fn = (this as any)._langDetach
    if (typeof fn === 'function') fn()
    ;(this as any)._langDetach = null
  },

  onShow() {
    // Set navigation bar title when page becomes visible
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    wx.setNavigationBarTitle({ title: t('app.navTitle', lang) })
  },

  syncLanguageFromApp() {
      const app = getApp<IAppOption>() as any
      const lang = normalizeLanguage(app?.globalData?.language)

      const labelByType: Record<FilterType, string> = {
        '国内': t('jobs.regionDomestic', lang),
        '国外': t('jobs.regionAbroad', lang),
        web3: t('jobs.regionWeb3', lang),
      }

      const displayFilterOptions = (this.data.filterOptions as FilterType[]).map((k) => labelByType[k])
      const displayCurrentFilter = labelByType[this.data.currentFilter as FilterType]

      this.setData({
        ui: {
          searchPlaceholder: t('jobs.searchPlaceholder', lang),
          filterLabel: t('jobs.filterLabel', lang),
        },
        displayFilterOptions,
        displayCurrentFilter,
      })
    },

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
        const collectionName = typeCollectionMap[this.data.currentFilter] || 'domestic_remote_jobs'

        // Create a regex for case-insensitive search
        const searchRegex = db.RegExp({ regexp: keyword, options: 'i' })

        // Since we can't fetch all data at once, we'll fetch a large batch (up to 100)
        // for the search result. This is a limitation of client-side database queries.
        const res = await db.collection(collectionName).where(_.or([
          { title: searchRegex },
          { source_name: searchRegex },
        ])).orderBy('createdAt', 'desc').limit(100).get()

        const mappedJobs = mapJobs(res.data || []) as JobItem[]

        this.setData({
          jobs: mappedJobs,
          filteredJobs: mappedJobs,
          hasMore: false, // No pagination for search results
          scrollTop: 0,
        }, () => {
          // this.checkScrollability()
        })
      } catch (err) {
        console.error('[jobs] Collection search error', err)
        wx.showToast({ title: '搜索失败', icon: 'none' })
      } finally {
        this.setData({ loading: false })
      }
    },

    closeFilter() {
      if (!this.data.showFilter) return
      this.setData({ showFilter: false })
    },

    toggleFilter() {
      this.setData({ showFilter: !this.data.showFilter })
    },

    stopPropagation() {},

    async onSelectFilter(e: WechatMiniprogram.TouchEvent) {
      const value = e.currentTarget.dataset.value as FilterType
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

      // refresh labels after changing filter
      this.syncLanguageFromApp()

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
        // this.checkScrollability()
      })
    },

    async loadJobs(reset = false) {
      if (this.data.loading) return
      this.setData({ loading: true, isSearching: false })

      try {
        const db = wx.cloud.database()
        const { pageSize, currentFilter } = this.data
        const collectionName = typeCollectionMap[currentFilter] || 'domestic_remote_jobs'
        const skip = reset ? 0 : this.data.jobs.length

        const res = await db
          .collection(collectionName)
          .orderBy('createdAt', 'desc')
          .skip(skip)
          .limit(pageSize)
          .get()

        const newJobs = mapJobs(res.data || []) as JobItem[]
        const allJobs = reset ? newJobs : [...this.data.jobs, ...newJobs]

          this.setData({
          jobs: allJobs,
          filteredJobs: allJobs,
          hasMore: newJobs.length === pageSize,
        }, () => {
          // this.checkScrollability()
        })
      } catch (e) {
        console.error('[jobs] loadJobs error', e)
        wx.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.setData({ loading: false })
      }
    },

    maybeLoadMore() {
      if (this.data.isSearching) return

      const { loading, hasMore, lastLoadTime } = this.data
      const now = Date.now()
      if (loading || !hasMore || now - lastLoadTime < 500) return

      this.setData({ lastLoadTime: now })
      this.loadJobs(false)
    },

    onScroll(e: any) {
      // no-op (no-more hint removed)
    },

    onTouchStart() {
      this.setData({ isDragging: true })
    },

    onTouchEnd() {
      this.setData({ isDragging: false })
    },

    toggleDrawer() {
      this.setData({ showDrawer: !this.data.showDrawer })
    },


    closeJobDetail() {
      this.setData({ showJobDetail: false })
    },

    onDrawerConfirm(e: WechatMiniprogram.CustomEvent) {
      const value = (e.detail?.value || DEFAULT_DRAWER_FILTER) as DrawerFilterValue
      this.setData({ drawerFilter: { ...DEFAULT_DRAWER_FILTER, ...value }, showDrawer: false }, () => {
        this.applyDrawerFilters()
      })
    },

    onDrawerReset(e: WechatMiniprogram.CustomEvent) {
      const value = (e.detail?.value || DEFAULT_DRAWER_FILTER) as DrawerFilterValue
      this.setData({ drawerFilter: { ...DEFAULT_DRAWER_FILTER, ...value }, showDrawer: false }, () => {
        this.applyDrawerFilters()
      })
    },

    applyDrawerFilters() {
      // keep search behavior: if searching, don't re-filter result set here
      if (this.data.isSearching) return

      const { jobs, drawerFilter, searchKeyword } = this.data

      // first, apply keyword locally (existing behavior)
      const keyword = (searchKeyword || '').toLowerCase()
      let list = jobs
      if (keyword) {
        list = list.filter((job) => {
          const title = (job.title || '').toLowerCase()
          const sourceName = (job.source_name || '').toLowerCase()
          return title.indexOf(keyword) > -1 || sourceName.indexOf(keyword) > -1
        })
      }

      // then apply drawer filters (simple contains match for now)
      if (drawerFilter?.salary && drawerFilter.salary !== '全部') {
        list = list.filter((j) => (j.salary || '').includes(drawerFilter.salary))
      }
      if (drawerFilter?.experience && drawerFilter.experience !== '全部') {
        const text = drawerFilter.experience
        list = list.filter((j) => {
          const summary = j.summary || ''
          const desc = j.description || ''
          const tags = (j.tags || []).join(',')
          return summary.includes(text) || desc.includes(text) || tags.includes(text)
        })
      }

      this.setData({ filteredJobs: list, scrollTop: 0 }, () => {
        // this.checkScrollability()
      })
    },

    onJobTap(e: any) {
      const _id = (e?.detail?._id || e?.currentTarget?.dataset?._id) as string
      const collectionName = typeCollectionMap[this.data.currentFilter] || 'domestic_remote_jobs'

      if (!_id) return

      this.setData({
        selectedJobId: _id,
        selectedCollection: collectionName,
        showJobDetail: true,
      })
    },
})
