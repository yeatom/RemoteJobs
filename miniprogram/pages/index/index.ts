import type { JobItem, ResolvedSavedJob } from '../../utils/job'
import { mapJobs, typeCollectionMap } from '../../utils/job'
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'
import { toDateMs } from '../../utils/time'

type FilterType = '国内' | '国外' | 'web3'

type DrawerFilterValue = {
  salary: string
  experience: string
  source?: string
}

const DEFAULT_DRAWER_FILTER: DrawerFilterValue = {
  salary: '全部',
  experience: '全部',
  source: '全部',
}

Page({
  data: {
    jobs: <JobItem[]>[],
    filteredJobs: <JobItem[]>[],
    currentTab: 0,
    tabLabels: ['公开', '精选', '收藏'],
    jobsByTab: [<JobItem[]>[], <JobItem[]>[], <JobItem[]>[]] as JobItem[][],
    hasLoadedTab: [false, false, false] as boolean[],
    regionCache: {} as Record<FilterType, JobItem[]>,
    isFeaturedUnlocked: false,
    featuredScrollEnabled: true,
    filterOptions: ['国内', '国外', 'web3'] as FilterType[],
    pageSize: 15,
    loading: false,
    hasMore: true,
    lowerThreshold: 100,
    scrollViewHeight: 0,
    lastLoadTime: 0,
    showJobDetail: false,
    selectedJobData: null as any,

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
  getCurrentTabState() {
    return this.data.tabState[this.data.currentTab]
  },

  updateCurrentTabState(updates: Partial<typeof this.data.tabState[0]>, callback?: () => void) {
    const tabState = [...this.data.tabState]
    tabState[this.data.currentTab] = { ...tabState[this.data.currentTab], ...updates }
    this.setData({ tabState }, callback)
  },

  onLoad() {
      ;(this as any)._langDetach = attachLanguageAware(this, {
        onLanguageRevive: () => {
          this.syncLanguageFromApp()
        const app = getApp<IAppOption>() as any
        const lang = normalizeLanguage(app?.globalData?.language)
        wx.setNavigationBarTitle({ title: t('app.navTitle', lang) })
        },
      })

      this.getSystemAndUIInfo()
    this.loadJobsForTab(0, true).then(() => {
      try {
        const tabs = this.data.jobsByTab as JobItem[][]
        const primary = tabs[0] || []
        const loaded = this.data.hasLoadedTab as boolean[]
        loaded[0] = true
        
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
      this.preloadTabs()
    })
  },

  onUnload() {
      const fn = (this as any)._langDetach
      if (typeof fn === 'function') fn()
      ;(this as any)._langDetach = null
    },

  onShow() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    wx.setNavigationBarTitle({ title: t('app.navTitle', lang) })
    this.checkFeaturedSubscription()
  },

  onPullDownRefresh() {
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
    this.maybeLoadMore()
  },

  onScrollLower() {
    this.maybeLoadMore()
  },

  onSwiperChange(e: any) {
    const idx = e.detail.current || 0
    if (idx === this.data.currentTab) return
    
    const currentState = this.getCurrentTabState()
    if (currentState.showFilter) {
      this.updateCurrentTabState({ showFilter: false })
    }
    if (currentState.showDrawer) {
      this.updateCurrentTabState({ showDrawer: false })
    }
    
    const tabs = (this.data as any).jobsByTab as JobItem[][]
    const loaded = (this.data as any).hasLoadedTab as boolean[]
    this.setData({ currentTab: idx })
    
    if (idx === 1) {
      this.checkFeaturedSubscription()
      if (!loaded[idx]) {
        this.loadJobsForTab(idx, true).catch(() => {})
      } else {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx] })
      }
    } else if (idx === 2) {
      if (!loaded[idx]) {
        this.loadSavedJobsForTab()
      } else {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx] })
      }
      } else {
      const currentState = this.getCurrentTabState()
      if (loaded[idx]) {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx], loading: false })
      } else {
        const cache = (this.data as any).regionCache as Record<FilterType, JobItem[]>
        const cachedJobs = cache[currentState.currentFilter]
        if (cachedJobs && cachedJobs.length > 0) {
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
    
    const currentState = this.getCurrentTabState()
    if (currentState.showFilter) {
      this.updateCurrentTabState({ showFilter: false })
    }
    if (currentState.showDrawer) {
      this.updateCurrentTabState({ showDrawer: false })
    }
    
    const tabs = (this.data as any).jobsByTab as JobItem[][]
    const loaded = (this.data as any).hasLoadedTab as boolean[]
    this.setData({ currentTab: idx })
    
    if (idx === 1) {
      this.checkFeaturedSubscription()
      if (!loaded[idx]) {
        this.loadJobsForTab(idx, true).catch(() => {})
      } else {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx] })
      }
    } else if (idx === 2) {
      if (!loaded[idx]) {
        this.loadSavedJobsForTab()
      } else {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx] })
      }
      } else {
      const currentState = this.getCurrentTabState()
      if (loaded[idx]) {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx], loading: false })
      } else {
        const cache = (this.data as any).regionCache as Record<FilterType, JobItem[]>
        const cachedJobs = cache[currentState.currentFilter]
        if (cachedJobs && cachedJobs.length > 0) {
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
        const lowerThreshold = windowInfo.windowHeight / 2
        this.setData({ lowerThreshold })
      } catch (err) {
        // ignore
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

      const self = this as any
      if (self._searchTimer) {
        clearTimeout(self._searchTimer)
      }
      self._searchTimer = setTimeout(() => {
        const currentKeyword = (this.getCurrentTabState().searchKeyword || '').trim()
        if (currentKeyword) {
          this.performCollectionSearch(currentKeyword, true)
        } else {
          this.updateCurrentTabState({ isSearching: false })
          this.setData({ hasMore: true, loading: true })
          if (this.data.currentTab === 0) {
            this.loadJobsForTab(0, true).then(() => {
              const tabs = this.data.jobsByTab as JobItem[][]
              this.setData({
                jobs: tabs[0] || [],
                filteredJobs: tabs[0] || [],
                loading: false,
              })
            }).catch(() => {
              this.setData({ loading: false })
            })
          } else if (this.data.currentTab === 1) {
            this.loadJobsForTab(1, true).then(() => {
              const tabs = this.data.jobsByTab as JobItem[][]
              this.setData({
                jobs: tabs[1] || [],
                filteredJobs: tabs[1] || [],
                loading: false,
              })
            }).catch(() => {
              this.setData({ loading: false })
            })
          } else if (this.data.currentTab === 2) {
            this.loadSavedJobsForTab()
          }
        }
      }, 200)
    },

    async performCollectionSearch(keyword: string, reset = false) {
      if (!keyword || !keyword.trim()) {
        return
      }
      
      this.setData({ loading: true })
      if (reset) {
        this.updateCurrentTabState({ isSearching: true, scrollTop: 0 })
      }
      try {
        const db = wx.cloud.database()
        const currentState = this.getCurrentTabState()
        const collectionName = typeCollectionMap[currentState.currentFilter] || 'domestic_remote_jobs'

        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const searchRegex = db.RegExp({ regexp: escapedKeyword, options: 'i' })

        const existingJobs = reset ? [] : (this.data.jobsByTab[this.data.currentTab] || [])
        const skip = existingJobs.length
        const res = await db.collection(collectionName).where({
          title: searchRegex,
        }).orderBy('createdAt', 'desc').skip(skip).limit(this.data.pageSize).get()

        const mappedJobs = mapJobs(res.data || []) as JobItem[]
        const mergedJobs = reset ? mappedJobs : [...existingJobs, ...mappedJobs]

        const tabs = this.data.jobsByTab as JobItem[][]
        tabs[this.data.currentTab] = mergedJobs
        if (reset) {
          this.updateCurrentTabState({ scrollTop: 0 })
        }
        this.setData({
          jobsByTab: tabs,
          jobs: mergedJobs,
          filteredJobs: mergedJobs,
          hasMore: mappedJobs.length >= this.data.pageSize,
        })
      } catch (err) {
        wx.showToast({ title: '搜索失败', icon: 'none' })
        if (reset) {
          this.updateCurrentTabState({ isSearching: false })
        }
      } finally {
        this.setData({ loading: false })
      }
    },

    async loadJobsForTab(tabIndex: number, reset = false) {
      try {
        if (tabIndex === 1) {
          const collections = Object.values(typeCollectionMap)
          
          const res = await wx.cloud.callFunction({
            name: 'getJobList',
            data: {
              collectionNames: collections,
              pageSize: this.data.pageSize,
            },
          })
          
          if (res.result && (res.result as any).ok) {
            const jobs = (res.result as any).jobs || []
            const mapped = mapJobs(jobs) as JobItem[]
            
            const tabs = this.data.jobsByTab as JobItem[][]
            tabs[tabIndex] = mapped
            const loaded = this.data.hasLoadedTab as boolean[]
            loaded[tabIndex] = true
            const hasMore = mapped.length >= this.data.pageSize
            this.setData({ jobsByTab: tabs, hasLoadedTab: loaded, hasMore })
          }
        } else {
          const currentState = this.getCurrentTabState()
          const collectionName = typeCollectionMap[currentState.currentFilter] || 'domestic_remote_jobs'
          const skip = reset ? 0 : (this.data.jobsByTab[tabIndex] || []).length
          
          const res = await wx.cloud.callFunction({
            name: 'getJobList',
            data: {
              collectionName,
              pageSize: this.data.pageSize,
              skip,
            },
          })
          
          if (res.result && (res.result as any).ok) {
            const jobs = (res.result as any).jobs || []
            const newJobs = mapJobs(jobs) as JobItem[]
            const existing = (this.data.jobsByTab[tabIndex] || []) as JobItem[]
            const merged = reset ? newJobs : [...existing, ...newJobs]

            const cache = (this.data as any).regionCache as Record<FilterType, JobItem[]>
            cache[currentState.currentFilter] = merged
            this.setData({ regionCache: cache })

            const tabs = this.data.jobsByTab as JobItem[][]
            tabs[tabIndex] = merged
            const loaded = this.data.hasLoadedTab as boolean[]
            loaded[tabIndex] = true
            const hasMore = newJobs.length >= this.data.pageSize
            this.setData({ jobsByTab: tabs, hasLoadedTab: loaded, hasMore })
          }
        }
      } catch (err) {
        // ignore
      }
    },

    preloadTabs() {
      this.loadJobsForTab(1, true).catch(() => {})
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
          const _id = row?.jobId // 从 collected_jobs 集合读取的 jobId 字段（实际是岗位的 _id）
          if (!type || !_id) continue

          const key = `${type}:${_id}`
          const job = jobByKey.get(key)
          if (!job) continue

          merged.push({
            ...(job as any),
            _id,
            sourceCollection: job.sourceCollection,
          })
        }

        const normalized = mapJobs(merged) as JobItem[]
        const tabs = this.data.jobsByTab as JobItem[][]
        tabs[2] = normalized
        const loaded = this.data.hasLoadedTab as boolean[]
        loaded[2] = true
        
        const updateData: any = { jobsByTab: tabs, hasLoadedTab: loaded }
        if (this.data.currentTab === 2) {
          updateData.jobs = normalized
          updateData.filteredJobs = normalized
        }
        this.setData(updateData)
      } catch (err) {
        wx.showToast({ title: '加载收藏失败', icon: 'none' })
      } finally {
        this.setData({ loading: false })
      }
    },

    onFeaturedSubscribeTap() {
      wx.showModal({
        title: '精选岗位 🔒',
        content: '该功能需要付费解锁。',
        confirmText: '去付费',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
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
        const tabs = this.data.jobsByTab as JobItem[][]
        tabs[0] = cachedJobs || []
        const loaded = this.data.hasLoadedTab as boolean[]
        loaded[0] = !!cachedJobs
        this.setData({ jobsByTab: tabs, hasLoadedTab: loaded })
      }
    },

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
        return title.indexOf(keyword) > -1
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
        })
      } catch (e) {
        wx.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.setData({ loading: false })
      }
    },

    maybeLoadMore() {
      const currentState = this.getCurrentTabState()
      const { loading, hasMore, lastLoadTime } = this.data
      const now = Date.now()
      if (loading || !hasMore || now - lastLoadTime < 500) return

      this.setData({ lastLoadTime: now })
      
      if (currentState.isSearching && currentState.searchKeyword) {
        this.performCollectionSearch(currentState.searchKeyword, false)
        return
      }

      if (this.data.currentTab === 0) {
        this.loadJobsForTab(0, false)
      } else if (this.data.currentTab === 1) {
        this.loadJobsForTab(1, false)
      }
    },

    onScroll() {
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

    // 处理职位收藏状态变化事件
    onJobCollectChange(e: any) {
      const { _id, isSaved } = e.detail || {}
      if (!_id) return

      const tabs = this.data.jobsByTab as JobItem[][]
      let updated = false

      for (let tabIndex = 0; tabIndex < 2; tabIndex++) {
        const jobs = tabs[tabIndex]
        const updatedJobs = jobs.map(job => {
          if (job._id === _id) {
            updated = true
            return { ...job, isSaved }
          }
          return job
        })
        if (updated) {
          tabs[tabIndex] = updatedJobs
        }
      }

      const cache = (this.data as any).regionCache as Record<FilterType, JobItem[]>
      for (const region in cache) {
        const jobs = cache[region as FilterType]
        if (jobs) {
          const updatedJobs = jobs.map(job => {
            if (job._id === _id) {
              return { ...job, isSaved }
            }
            return job
          })
          cache[region as FilterType] = updatedJobs
        }
      }

      const currentTab = this.data.currentTab
      let filteredJobs = this.data.filteredJobs || []
      if (currentTab !== 2) {
        filteredJobs = filteredJobs.map(job => {
          if (job._id === _id) {
            return { ...job, isSaved }
          }
          return job
        })
      }

      const loaded = this.data.hasLoadedTab as boolean[]
      if (loaded[2]) {
        this.loadSavedJobsForTab().catch(() => {})
      }

      this.setData({
        jobsByTab: tabs,
        regionCache: cache,
        filteredJobs,
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
      if (currentState.isSearching) return

      const { jobs } = this.data
      const { drawerFilter, searchKeyword } = currentState

      // first, apply keyword locally (existing behavior)
      const keyword = (searchKeyword || '').toLowerCase()
      let list = jobs
      if (keyword) {
        list = list.filter((job) => {
          const title = (job.title || '').toLowerCase()
          return title.indexOf(keyword) > -1
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
      const _id = (job?._id || e?.currentTarget?.dataset?._id) as string

      if (!_id || !job) return

      // 如果从收藏tab打开，确保isSaved为true，避免UI闪烁
      let jobData = { ...job }
      if (this.data.currentTab === 2) {
        jobData.isSaved = true
      }

      this.setData({ 
        showJobDetail: false,
        selectedJobData: null,
      }, () => {
        this.setData({
          selectedJobData: jobData,
          showJobDetail: true,
        })
      })
  },
})
