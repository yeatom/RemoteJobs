// index.ts - remote jobs list

import type { JobItem, ResolvedSavedJob } from '../../utils/job'
import { mapJobs, typeCollectionMap } from '../../utils/job'
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'
import { toDateMs } from '../../utils/time'

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
    // Tab state
    currentTab: 0,
    tabLabels: ['公开', '精选', '收藏'],
    // Preloaded data per tab (index -> JobItem[])
    jobsByTab: [<JobItem[]>[], <JobItem[]>[], <JobItem[]>[]] as JobItem[][],
    hasLoadedTab: [false, false, false] as boolean[],
    // Memory cache for region data (region -> JobItem[])
    regionCache: {} as Record<FilterType, JobItem[]>,
    // Subscription status for 精选 tab
    isFeaturedUnlocked: false,
    featuredScrollEnabled: true,
    filterOptions: ['国内', '国外', 'web3'] as FilterType[],
    pageSize: 15,
    loading: false,
    hasMore: true,
    lowerThreshold: 100,
    scrollViewHeight: 0, // scroll-view 的可视高度（px）
    lastLoadTime: 0, // 上次分页加载的时间戳，用于防抖
    showJobDetail: false, // Controls the visibility of the job detail drawer
    selectedJobData: null as any, // The selected job data (includes displayTags)

    // Per-tab state (index -> state)
    tabState: [
      {
        showFilter: false,
        currentFilter: '国内' as FilterType,
        searchKeyword: '',
        scrollTop: 0,
        showDrawer: false,
        isSearching: false,
        drawerFilter: { ...DEFAULT_DRAWER_FILTER } as DrawerFilterValue,
        displayCurrentFilter: '国内',
        displayFilterOptions: ['国内', '国外', 'web3'],
      },
      {
        showFilter: false,
        currentFilter: '国内' as FilterType,
        searchKeyword: '',
        scrollTop: 0,
        showDrawer: false,
        isSearching: false,
        drawerFilter: { ...DEFAULT_DRAWER_FILTER } as DrawerFilterValue,
        displayCurrentFilter: '国内',
        displayFilterOptions: ['国内', '国外', 'web3'],
      },
      {
        showFilter: false,
        currentFilter: '国内' as FilterType,
        searchKeyword: '',
        scrollTop: 0,
        showDrawer: false,
        isSearching: false,
        drawerFilter: { ...DEFAULT_DRAWER_FILTER } as DrawerFilterValue,
        displayCurrentFilter: '国内',
        displayFilterOptions: ['国内', '国外', 'web3'],
      },
    ] as Array<{
      showFilter: boolean
      currentFilter: FilterType
      searchKeyword: string
      scrollTop: number
      showDrawer: boolean
      isSearching: boolean
      drawerFilter: DrawerFilterValue
      displayCurrentFilter: string
      displayFilterOptions: string[]
    }>,

    ui: {
      searchPlaceholder: '搜索职位名称或来源..',
      filterLabel: '筛选',
    } as Record<string, string>,
  },
  // Helper to get current tab state
  getCurrentTabState() {
    return this.data.tabState[this.data.currentTab]
  },

  // Helper to update current tab state
  updateCurrentTabState(updates: Partial<typeof this.data.tabState[0]>, callback?: () => void) {
    const tabState = [...this.data.tabState]
    tabState[this.data.currentTab] = { ...tabState[this.data.currentTab], ...updates }
    this.setData({ tabState }, callback)
  },

  onLoad() {
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
    // Load primary tab immediately, then preload others in background
    this.loadJobsForTab(0, true).then(() => {
      // store primary tab data into cache
      try {
        const tabs = this.data.jobsByTab as JobItem[][]
        const primary = tabs[0] || []
        const loaded = this.data.hasLoadedTab as boolean[]
        loaded[0] = true
        
        // Also store in region cache
        const cache = (this.data as any).regionCache as Record<FilterType, JobItem[]>
        const currentState = this.getCurrentTabState()
        cache[currentState.currentFilter] = primary
        this.setData({ 
          jobsByTab: tabs, 
          hasLoadedTab: loaded, 
          regionCache: cache,
          jobs: primary,
          filteredJobs: primary,
        })
      } catch {
        // ignore
      }
      // preload other tabs
      this.preloadTabs()
    })
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
    // Check subscription status for 精选 tab
    this.checkFeaturedSubscription()
  },

  onPullDownRefresh() {
    // Handle pull down to refresh
    const currentState = this.getCurrentTabState()
    if (this.data.currentTab === 0) {
      this.loadJobsForTab(0, true).finally(() => {
        wx.stopPullDownRefresh()
      })
    } else if (this.data.currentTab === 1) {
      this.loadJobsForTab(1, true).finally(() => {
        wx.stopPullDownRefresh()
      })
    } else if (this.data.currentTab === 2) {
      this.loadSavedJobsForTab().finally(() => {
        wx.stopPullDownRefresh()
      })
    } else {
      wx.stopPullDownRefresh()
    }
  },

  onReachBottom() {
    // Handle reach bottom to load more
    this.maybeLoadMore()
  },

  onScrollLower() {
    // Handle scroll to lower from job-list component
    this.maybeLoadMore()
  },

  onSwiperChange(e: any) {
    // Handle swiper change (swipe gesture)
    const idx = e.detail.current || 0
    if (idx === this.data.currentTab) return // No change
    
    // Close filter dropdown and drawer when switching tabs
    const currentState = this.getCurrentTabState()
    if (currentState.showFilter) {
      this.updateCurrentTabState({ showFilter: false })
    }
    if (currentState.showDrawer) {
      this.updateCurrentTabState({ showDrawer: false })
    }
    
    // switch tab visually — load from cache if available
    const tabs = (this.data as any).jobsByTab as JobItem[][]
    const loaded = (this.data as any).hasLoadedTab as boolean[]
    this.setData({ currentTab: idx })
    
    if (idx === 1) {
      // 精选 tab - check subscription and load jobs (even if locked, show preview)
      this.checkFeaturedSubscription()
      if (!loaded[idx]) {
        // Load jobs even if locked (for preview)
        this.loadJobsForTab(idx, true).catch(() => {})
      } else {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx] })
      }
    } else if (idx === 2) {
      // 收藏 tab - load saved jobs
      if (!loaded[idx]) {
        this.loadSavedJobsForTab()
      } else {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx] })
      }
      } else {
      // 公开 tab
      const currentState = this.getCurrentTabState()
      if (loaded[idx]) {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx], loading: false })
      } else {
        // Check cache first
        const cache = (this.data as any).regionCache as Record<FilterType, JobItem[]>
        const cachedJobs = cache[currentState.currentFilter]
        if (cachedJobs && cachedJobs.length > 0) {
          // Show cached data immediately
          const updatedTabs = this.data.jobsByTab as JobItem[][]
          updatedTabs[idx] = cachedJobs
          const updatedLoaded = this.data.hasLoadedTab as boolean[]
          updatedLoaded[idx] = true
          this.setData({ 
            jobsByTab: updatedTabs, 
            hasLoadedTab: updatedLoaded,
            jobs: cachedJobs, 
            filteredJobs: cachedJobs,
            loading: false,
          })
        } else {
          // No cache, show loading
          this.setData({ loading: true })
        }
        // Load fresh data in background
        this.loadJobsForTab(idx, true).then(() => {
          const updatedTabs = this.data.jobsByTab as JobItem[][]
          if (this.data.currentTab === idx) {
            this.setData({ 
              jobs: updatedTabs[idx] || [], 
              filteredJobs: updatedTabs[idx] || [],
              loading: false,
            })
          }
        }).catch(() => {
          if (this.data.currentTab === idx) {
            this.setData({ loading: false })
          }
        })
      }
    }
  },

  onTabTap(e: any) {
    const idx = Number(e.currentTarget.dataset.idx || 0)
    
    // Close filter dropdown and drawer when switching tabs
    const currentState = this.getCurrentTabState()
    if (currentState.showFilter) {
      this.updateCurrentTabState({ showFilter: false })
    }
    if (currentState.showDrawer) {
      this.updateCurrentTabState({ showDrawer: false })
    }
    
    // switch tab visually — load from cache if available
    const tabs = (this.data as any).jobsByTab as JobItem[][]
    const loaded = (this.data as any).hasLoadedTab as boolean[]
    this.setData({ currentTab: idx })
    
    if (idx === 1) {
      // 精选 tab - check subscription and load jobs (even if locked, show preview)
      this.checkFeaturedSubscription()
      if (!loaded[idx]) {
        // Load jobs even if locked (for preview)
        this.loadJobsForTab(idx, true).catch(() => {})
      } else {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx] })
      }
    } else if (idx === 2) {
      // 收藏 tab - load saved jobs
      if (!loaded[idx]) {
        this.loadSavedJobsForTab()
      } else {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx] })
      }
      } else {
      // 公开 tab
      const currentState = this.getCurrentTabState()
      if (loaded[idx]) {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx], loading: false })
      } else {
        // Check cache first
        const cache = (this.data as any).regionCache as Record<FilterType, JobItem[]>
        const cachedJobs = cache[currentState.currentFilter]
        if (cachedJobs && cachedJobs.length > 0) {
          // Show cached data immediately
          const updatedTabs = this.data.jobsByTab as JobItem[][]
          updatedTabs[idx] = cachedJobs
          const updatedLoaded = this.data.hasLoadedTab as boolean[]
          updatedLoaded[idx] = true
          this.setData({ 
            jobsByTab: updatedTabs, 
            hasLoadedTab: updatedLoaded,
            jobs: cachedJobs, 
            filteredJobs: cachedJobs,
            loading: false,
          })
        } else {
          // No cache, show loading
          this.setData({ loading: true })
        }
        // Load fresh data in background
        this.loadJobsForTab(idx, true).then(() => {
          const updatedTabs = this.data.jobsByTab as JobItem[][]
          if (this.data.currentTab === idx) {
            this.setData({ 
              jobs: updatedTabs[idx] || [], 
              filteredJobs: updatedTabs[idx] || [],
              loading: false,
            })
          }
        }).catch(() => {
          if (this.data.currentTab === idx) {
            this.setData({ loading: false })
          }
        })
      }
    }
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
      
      // Update all tabs' display labels
      const tabState = this.data.tabState.map((state, idx) => ({
        ...state,
        displayCurrentFilter: labelByType[state.currentFilter],
        displayFilterOptions,
      }))

      this.setData({
        ui: {
          searchPlaceholder: t('jobs.searchPlaceholder', lang),
          filterLabel: t('jobs.filterLabel', lang),
          emptyFavorites: t('me.emptyFavorites', lang),
        },
        tabState,
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
      this.updateCurrentTabState({ searchKeyword: keyword })

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
          this.updateCurrentTabState({ isSearching: false })
          if (this.data.currentTab === 0) {
            this.loadJobsForTab(0, true)
          } else if (this.data.currentTab === 1) {
            this.loadJobsForTab(1, true)
          } else if (this.data.currentTab === 2) {
            this.loadSavedJobsForTab()
          }
        }
      }, 400)
    },

    async performCollectionSearch(keyword: string) {
      this.setData({ loading: true })
      this.updateCurrentTabState({ isSearching: true })
      try {
        const db = wx.cloud.database()
        const _ = db.command
        const currentState = this.getCurrentTabState()
        const collectionName = typeCollectionMap[currentState.currentFilter] || 'domestic_remote_jobs'

        // Create a regex for case-insensitive search
        const searchRegex = db.RegExp({ regexp: keyword, options: 'i' })

        // Since we can't fetch all data at once, we'll fetch a large batch (up to 100)
        // for the search result. This is a limitation of client-side database queries.
        const res = await db.collection(collectionName).where(_.or([
          { title: searchRegex },
          { source_name: searchRegex },
        ])).orderBy('createdAt', 'desc').limit(100).get()

        const mappedJobs = mapJobs(res.data || []) as JobItem[]

        // Update jobs for current tab
        const tabs = this.data.jobsByTab as JobItem[][]
        tabs[this.data.currentTab] = mappedJobs
        this.updateCurrentTabState({ scrollTop: 0 })
        this.setData({
          jobsByTab: tabs,
          jobs: mappedJobs,
          filteredJobs: mappedJobs,
          hasMore: false, // No pagination for search results
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

    // Load jobs for a specific tab index (for preloading).
    async loadJobsForTab(tabIndex: number, reset = false) {
      try {
        const db = wx.cloud.database()
        
        if (tabIndex === 1) {
          // 精选 tab: load from all collections
          const collections = Object.values(typeCollectionMap)
          const allJobs: JobItem[] = []
          
          for (const collectionName of collections) {
            try {
              const skip = reset ? 0 : 0 // For featured, always start fresh or implement pagination later
              const res = await db
                .collection(collectionName)
                .orderBy('createdAt', 'desc')
                .skip(skip)
                .limit(this.data.pageSize)
                .get()
              
              const mapped = mapJobs(res.data || []) as JobItem[]
              // Add sourceCollection to each job for reference
              mapped.forEach(job => {
                (job as any).sourceCollection = collectionName
              })
              allJobs.push(...mapped)
            } catch (err) {
              console.error(`[jobs] loadJobsForTab error for ${collectionName}`, err)
            }
          }
          
          // Sort by createdAt descending
          allJobs.sort((a, b) => {
            const aTime = new Date(a.createdAt).getTime()
            const bTime = new Date(b.createdAt).getTime()
            return bTime - aTime
          })
          
          // Limit to pageSize
          const limited = allJobs.slice(0, this.data.pageSize)
          
          const tabs = this.data.jobsByTab as JobItem[][]
          tabs[tabIndex] = limited
          const loaded = this.data.hasLoadedTab as boolean[]
          loaded[tabIndex] = true
          this.setData({ jobsByTab: tabs, hasLoadedTab: loaded })
        } else {
          // 公开 tab: use current filter collection
          const currentState = this.getCurrentTabState()
          const collectionName = typeCollectionMap[currentState.currentFilter] || 'domestic_remote_jobs'
          const skip = reset ? 0 : (this.data.jobsByTab[tabIndex] || []).length
          const res = await db
            .collection(collectionName)
            .orderBy('createdAt', 'desc')
            .skip(skip)
            .limit(this.data.pageSize)
            .get()

          const newJobs = mapJobs(res.data || []) as JobItem[]
          const existing = (this.data.jobsByTab[tabIndex] || []) as JobItem[]
          const merged = reset ? newJobs : [...existing, ...newJobs]

          // Update cache for current region
          const cache = (this.data as any).regionCache as Record<FilterType, JobItem[]>
          cache[currentState.currentFilter] = merged
          this.setData({ regionCache: cache })

          const tabs = this.data.jobsByTab as JobItem[][]
          tabs[tabIndex] = merged
          const loaded = this.data.hasLoadedTab as boolean[]
          loaded[tabIndex] = true
          this.setData({ jobsByTab: tabs, hasLoadedTab: loaded })
        }
      } catch (err) {
        console.error('[jobs] loadJobsForTab error', err)
      }
    },

    preloadTabs() {
      // preload tab 1 (精选) - load even if locked (for preview)
      this.loadJobsForTab(1, true).catch(() => {})
      // preload tab 2 (收藏) in background
      this.loadSavedJobsForTab().catch(() => {})
    },

    checkFeaturedSubscription() {
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      const expired = user?.expiredDate
      if (!expired) {
        this.setData({ isFeaturedUnlocked: false, featuredScrollEnabled: false })
        return
      }
      const ms = toDateMs(expired)
      if (!ms) {
        this.setData({ isFeaturedUnlocked: false, featuredScrollEnabled: false })
        return
      }
      const isUnlocked = ms > Date.now()
      this.setData({ isFeaturedUnlocked: isUnlocked, featuredScrollEnabled: isUnlocked })
    },

    async loadSavedJobsForTab() {
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      const openid = user?.openid
      const isLoggedIn = !!(user && (user.isAuthed || user.phone))
      if (!isLoggedIn || !openid) {
        const tabs = this.data.jobsByTab as JobItem[][]
        tabs[2] = []
        const loaded = this.data.hasLoadedTab as boolean[]
        loaded[2] = true
        this.setData({ jobsByTab: tabs, hasLoadedTab: loaded, jobs: [], filteredJobs: [] })
        return
      }

      this.setData({ loading: true })
      try {
        const db = wx.cloud.database()

        const collectedRes = await db
          .collection('collected_jobs')
          .where({ openid })
          .orderBy('createdAt', 'desc')
          .limit(100)
          .get()

        const collected = (collectedRes.data || []) as any[]
        if (collected.length === 0) {
          const tabs = this.data.jobsByTab as JobItem[][]
          tabs[2] = []
          const loaded = this.data.hasLoadedTab as boolean[]
          loaded[2] = true
          this.setData({ jobsByTab: tabs, hasLoadedTab: loaded, jobs: [], filteredJobs: [] })
          return
        }

        const groups = new Map<string, string[]>()
        for (const row of collected) {
          const t = row?.type
          const id = row?.jobId
          if (!t || !id) continue
          const list = groups.get(t) || []
          list.push(id)
          groups.set(t, list)
        }

        const jobByKey = new Map<string, any>()
        const fetchGroup = async (type: string, ids: string[]) => {
          const collectionName = typeCollectionMap[type]
          if (!collectionName) return

          const results = await Promise.all(
            ids.map(async (id) => {
              try {
                const res = await db.collection(collectionName).doc(id).get()
                return { id, collectionName, data: res.data }
              } catch {
                return null
              }
            })
          )

          for (const r of results) {
            if (!r?.data) continue
            jobByKey.set(`${type}:${r.id}`, { ...r.data, _id: r.id, sourceCollection: r.collectionName })
          }
        }

        await Promise.all(Array.from(groups.entries()).map(([type, ids]) => fetchGroup(type, ids)))

        const merged: ResolvedSavedJob[] = []
        for (const row of collected) {
          const type = row?.type
          const jobId = row?.jobId
          if (!type || !jobId) continue

          const key = `${type}:${jobId}`
          const job = jobByKey.get(key)
          if (!job) continue

          merged.push({
            ...(job as any),
            jobId,
            sourceCollection: job.sourceCollection,
          })
        }

        const normalized = mapJobs(merged) as JobItem[]
        const tabs = this.data.jobsByTab as JobItem[][]
        tabs[2] = normalized
        const loaded = this.data.hasLoadedTab as boolean[]
        loaded[2] = true
        this.setData({ jobsByTab: tabs, hasLoadedTab: loaded, jobs: normalized, filteredJobs: normalized })
      } catch (err) {
        console.error('[index] loadSavedJobsForTab failed', err)
        wx.showToast({ title: '加载收藏失败', icon: 'none' })
      } finally {
        this.setData({ loading: false })
      }
    },

    onFeaturedSubscribeTap() {
      // Trigger payment popup (same as in me/index.ts)
      wx.showModal({
        title: '精选岗位 🔒',
        content: '该功能需要付费解锁。',
        confirmText: '去付费',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // TODO: replace with real payment flow.
            wx.showToast({ title: '暂未接入付费流程', icon: 'none' })
          }
        },
      })
    },

    closeFilter() {
      const currentState = this.getCurrentTabState()
      if (!currentState.showFilter) return
      this.updateCurrentTabState({ showFilter: false })
    },

    toggleFilter() {
      const currentState = this.getCurrentTabState()
      this.updateCurrentTabState({ showFilter: !currentState.showFilter })
    },

    stopPropagation() {},

    async onSelectFilter(e: WechatMiniprogram.TouchEvent) {
      const value = e.currentTarget.dataset.value as FilterType
      const currentState = this.getCurrentTabState()
      if (value === currentState.currentFilter) {
        this.updateCurrentTabState({ showFilter: false })
        return
      }

      this.updateCurrentTabState({
        currentFilter: value,
        showFilter: false,
        scrollTop: 0,
        searchKeyword: '',
        isSearching: false,
      })

      // refresh labels after changing filter
      this.syncLanguageFromApp()

      // Check cache first
      const cache = (this.data as any).regionCache as Record<FilterType, JobItem[]>
      const cachedJobs = cache[value]

      // If currently on tab 0, show cached data immediately (if available), then load
      if (this.data.currentTab === 0) {
        if (cachedJobs && cachedJobs.length > 0) {
          // Show cached data immediately
          const tabs = this.data.jobsByTab as JobItem[][]
          tabs[0] = cachedJobs
          this.setData({ 
            jobsByTab: tabs, 
            jobs: cachedJobs, 
            filteredJobs: cachedJobs,
            loading: false,
          })
        } else {
          // No cache, show loading state
          this.setData({ 
            jobs: [], 
            filteredJobs: [],
            loading: true,
          })
        }

        // Load fresh data (will update cache)
        await this.loadJobsForTab(0, true)
        const updatedTabs = this.data.jobsByTab as JobItem[][]
        this.setData({ 
          jobs: updatedTabs[0] || [], 
          filteredJobs: updatedTabs[0] || [],
          loading: false,
        })
      } else {
        // Not on tab 0, just reset cache flag
        const tabs = this.data.jobsByTab as JobItem[][]
        tabs[0] = cachedJobs || []
        const loaded = this.data.hasLoadedTab as boolean[]
        loaded[0] = !!cachedJobs
        this.setData({ jobsByTab: tabs, hasLoadedTab: loaded })
      }
    },

    // This function is now only for local filtering when not in search mode.
    // The search logic is handled by performCollectionSearch
    filterJobs() {
      const currentState = this.getCurrentTabState()
      if (currentState.isSearching) return

      const jobs = this.data.jobs
      const keyword = (currentState.searchKeyword || '').toLowerCase()

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
      this.setData({ loading: true })
      this.updateCurrentTabState({ isSearching: false })

      try {
        const db = wx.cloud.database()
        const { pageSize } = this.data
        const currentState = this.getCurrentTabState()
        const collectionName = typeCollectionMap[currentState.currentFilter] || 'domestic_remote_jobs'
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
      const currentState = this.getCurrentTabState()
      if (currentState.isSearching) return

      const { loading, hasMore, lastLoadTime } = this.data
      const now = Date.now()
      if (loading || !hasMore || now - lastLoadTime < 500) return

      this.setData({ lastLoadTime: now })
      if (this.data.currentTab === 0) {
        this.loadJobsForTab(0, false)
      } else if (this.data.currentTab === 1) {
        this.loadJobsForTab(1, false)
      }
    },

    onScroll() {
      // no-op (no-more hint removed)
    },

    onTouchStart() {
      this.setData({ isDragging: true })
    },

    onTouchEnd() {
      this.setData({ isDragging: false })
    },

    toggleDrawer() {
      const currentState = this.getCurrentTabState()
      this.updateCurrentTabState({ showDrawer: !currentState.showDrawer })
    },


    closeJobDetail() {
      this.setData({ 
        showJobDetail: false,
        selectedJobData: null,
      })
    },

    onDrawerConfirm(e: WechatMiniprogram.CustomEvent) {
      const value = (e.detail?.value || DEFAULT_DRAWER_FILTER) as DrawerFilterValue
      this.updateCurrentTabState({ 
        drawerFilter: { ...DEFAULT_DRAWER_FILTER, ...value }, 
        showDrawer: false 
      }, () => {
        this.applyDrawerFilters()
      })
    },

    onDrawerReset(e: WechatMiniprogram.CustomEvent) {
      const value = (e.detail?.value || DEFAULT_DRAWER_FILTER) as DrawerFilterValue
      this.updateCurrentTabState({ 
        drawerFilter: { ...DEFAULT_DRAWER_FILTER, ...value }, 
        showDrawer: false 
      }, () => {
        this.applyDrawerFilters()
      })
    },

    applyDrawerFilters() {
      const currentState = this.getCurrentTabState()
      // keep search behavior: if searching, don't re-filter result set here
      if (currentState.isSearching) return

      const { jobs } = this.data
      const { drawerFilter, searchKeyword } = currentState

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

      this.updateCurrentTabState({ scrollTop: 0 })
      this.setData({ filteredJobs: list }, () => {
        // this.checkScrollability()
      })
    },

    onJobTap(e: any) {
      const job = e?.detail?.job || e?.detail
      const _id = (job?._id || job?.jobId || e?.currentTarget?.dataset?._id) as string

      if (!_id || !job) return

      this.setData({ 
        showJobDetail: false,
        selectedJobData: null,
      }, () => {
        this.setData({
          selectedJobData: job,
          showJobDetail: true,
        })
      })
  },
})
