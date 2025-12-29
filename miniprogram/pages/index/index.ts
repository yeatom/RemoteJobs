import type { JobItem, ResolvedSavedJob } from '../../utils/job'
import { mapJobs } from '../../utils/job'
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'
import { toDateMs } from '../../utils/time'

type DrawerFilterValue = {
  salary: string
  experience: string
  source_name?: string[] // 支持多选
  region?: string // 单选
}

const DEFAULT_DRAWER_FILTER: DrawerFilterValue = {
  salary: '全部',
  experience: '全部',
  source_name: [], // 空数组表示"全部"
  region: '全部', // 单选，默认"全部"
}

Page({
  data: {
    jobs: <JobItem[]>[],
    filteredJobs: <JobItem[]>[],
    currentTab: 0,
    jobsByTab: [<JobItem[]>[], <JobItem[]>[], <JobItem[]>[]] as JobItem[][],
    hasLoadedTab: [false, false, false] as boolean[],
    isFeaturedUnlocked: false,
    featuredScrollEnabled: true,
    pageSize: 15,
    loading: false,
    hasMore: true,
    lowerThreshold: 100,
    lastLoadTime: 0,
    showJobDetail: false,
    selectedJobData: null as any,
    selectedCollection: 'remote_jobs', // 统一使用 remote_jobs collection

    tabState: [
      {
        searchKeyword: '',
        scrollTop: 0,
        showDrawer: false,
        isSearching: false,
        drawerFilter: { ...DEFAULT_DRAWER_FILTER } as DrawerFilterValue,
      },
      {
        searchKeyword: '',
        scrollTop: 0,
        showDrawer: false,
        isSearching: false,
        drawerFilter: { ...DEFAULT_DRAWER_FILTER } as DrawerFilterValue,
      },
      {
        searchKeyword: '',
        scrollTop: 0,
        showDrawer: false,
        isSearching: false,
        drawerFilter: { ...DEFAULT_DRAWER_FILTER } as DrawerFilterValue,
      },
    ] as Array<{
      searchKeyword: string
      scrollTop: number
      showDrawer: boolean
      isSearching: boolean
      drawerFilter: DrawerFilterValue
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

  hasActiveFilters(drawerFilter: DrawerFilterValue): boolean {
    const hasSourceFilter = !!(drawerFilter?.source_name && Array.isArray(drawerFilter.source_name) && drawerFilter.source_name.length > 0)
    const hasRegionFilter = !!(drawerFilter?.region && drawerFilter.region !== '全部')
    return hasSourceFilter || hasRegionFilter
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
        
        this.setData({ 
          jobsByTab: tabs, 
          hasLoadedTab: loaded,
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
    this.setData({ loading: true })
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
      }).finally(() => {
        wx.stopPullDownRefresh()
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
      }).finally(() => {
        wx.stopPullDownRefresh()
      })
    } else if (this.data.currentTab === 2) {
      this.loadSavedJobsForTab().then(() => {
        const tabs = this.data.jobsByTab as JobItem[][]
        this.setData({
          jobs: tabs[2] || [],
          filteredJobs: tabs[2] || [],
          loading: false,
        })
      }).catch(() => {
        this.setData({ loading: false })
      }).finally(() => {
        wx.stopPullDownRefresh()
      })
    } else {
      this.setData({ loading: false })
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
    if (currentState.showDrawer) {
      this.updateCurrentTabState({ showDrawer: false })
    }
    
    const tabs = (this.data as any).jobsByTab as JobItem[][]
    const loaded = (this.data as any).hasLoadedTab as boolean[]
    this.setData({ currentTab: idx })
    
    if (idx === 1) {
      this.checkFeaturedSubscription()
      if (!loaded[idx]) {
        this.setData({ loading: true })
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
      } else {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx], loading: false })
      }
    } else if (idx === 2) {
      if (!loaded[idx]) {
        // 未加载过，需要加载
        this.loadSavedJobsForTab().then(() => {
          // 确保加载完成后更新显示
          if (this.data.currentTab === idx) {
            const updatedTabs = this.data.jobsByTab as JobItem[][]
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
      } else {
        // 已加载过，检查数据是否为空（可能是预加载时因为未登录导致的）
        const savedJobs = tabs[idx] || []
        if (savedJobs.length === 0) {
          // 数据为空，可能是预加载时未登录，重新加载一次
          this.loadSavedJobsForTab().then(() => {
            if (this.data.currentTab === idx) {
              const updatedTabs = this.data.jobsByTab as JobItem[][]
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
        } else {
          // 有数据，直接显示
          this.setData({ jobs: savedJobs, filteredJobs: savedJobs, loading: false })
        }
      }
      } else {
      // tab 0 (公开)
      if (loaded[idx]) {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx], loading: false })
      } else {
        this.setData({ loading: true })
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
    if (currentState.showDrawer) {
      this.updateCurrentTabState({ showDrawer: false })
    }
    
    const tabs = (this.data as any).jobsByTab as JobItem[][]
    const loaded = (this.data as any).hasLoadedTab as boolean[]
    this.setData({ currentTab: idx })
    
    if (idx === 1) {
      this.checkFeaturedSubscription()
      if (!loaded[idx]) {
        this.setData({ loading: true })
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
      } else {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx], loading: false })
      }
    } else if (idx === 2) {
      if (!loaded[idx]) {
        // 未加载过，需要加载
        this.loadSavedJobsForTab().then(() => {
          // 确保加载完成后更新显示
          if (this.data.currentTab === idx) {
            const updatedTabs = this.data.jobsByTab as JobItem[][]
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
      } else {
        // 已加载过，检查数据是否为空（可能是预加载时因为未登录导致的）
        const savedJobs = tabs[idx] || []
        if (savedJobs.length === 0) {
          // 数据为空，可能是预加载时未登录，重新加载一次
          this.loadSavedJobsForTab().then(() => {
            if (this.data.currentTab === idx) {
              const updatedTabs = this.data.jobsByTab as JobItem[][]
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
        } else {
          // 有数据，直接显示
          this.setData({ jobs: savedJobs, filteredJobs: savedJobs, loading: false })
        }
      }
      } else {
      // tab 0 (公开)
      if (loaded[idx]) {
        this.setData({ jobs: tabs[idx], filteredJobs: tabs[idx], loading: false })
      } else {
        this.setData({ loading: true })
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

      this.setData({
        ui: {
          searchPlaceholder: t('jobs.searchPlaceholder', lang),
          filterLabel: t('jobs.filterLabel', lang),
          emptyFavorites: t('me.emptyFavorites', lang),
        },
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

        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const searchRegex = db.RegExp({ regexp: escapedKeyword, options: 'i' })

        // 构建 where 条件，同时包含搜索关键词和筛选条件
        const whereCondition: any = {
          title: searchRegex,
        }
        
        // 应用区域筛选（单选）
        const region = currentState.drawerFilter?.region || '全部'
        if (region !== '全部') {
          whereCondition.type = region
        } else {
          // 如果没有区域筛选，查询所有区域
          whereCondition.type = db.command.in(['国内', '国外', 'web3'])
        }
        
        // 应用来源筛选（支持多选）
        const source_names = currentState.drawerFilter?.source_name || []
        if (Array.isArray(source_names) && source_names.length > 0) {
          if (source_names.length === 1) {
            whereCondition.source_name = source_names[0]
          } else {
            whereCondition.source_name = db.command.in(source_names)
          }
        }

        const existingJobs = reset ? [] : (this.data.jobsByTab[this.data.currentTab] || [])
        const skip = existingJobs.length
        
        let query: any = db.collection('remote_jobs')
        if (Object.keys(whereCondition).length > 0) {
          query = query.where(whereCondition)
        }
        
        const res = await query
          .orderBy('createdAt', 'desc')
          .skip(skip)
          .limit(this.data.pageSize)
          .get()

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
        const currentState = this.getCurrentTabState()
        const skip = reset ? 0 : (this.data.jobsByTab[tabIndex] || []).length
        
        // 构建筛选参数
        const filterParams: any = {}
        
        // 区域筛选（单选）
        if (tabIndex === 1) {
          // 精选 tab：查询所有区域
          filterParams.types = ['国内', '国外', 'web3']
        } else {
          // 公开 tab：使用 drawerFilter 中的区域筛选
          const region = currentState.drawerFilter?.region || '全部'
          if (region !== '全部') {
            // 有区域筛选，使用筛选的区域
            filterParams.types = [region]
          } else {
            // 如果没有区域筛选，查询所有区域
            filterParams.types = ['国内', '国外', 'web3']
          }
        }
        
        // 来源筛选（支持多选）
        const source_names = currentState.drawerFilter?.source_name || []
        if (Array.isArray(source_names) && source_names.length > 0) {
          filterParams.source_name = source_names
        }
        
        const res = await wx.cloud.callFunction({
          name: 'getJobList',
          data: {
            pageSize: this.data.pageSize,
            skip,
            ...filterParams,
          },
        })
        
        if (res.result && (res.result as any).ok) {
          const jobs = (res.result as any).jobs || []
          const newJobs = mapJobs(jobs) as JobItem[]
          const existing = (this.data.jobsByTab[tabIndex] || []) as JobItem[]
          const merged = reset ? newJobs : [...existing, ...newJobs]

          const tabs = this.data.jobsByTab as JobItem[][]
          tabs[tabIndex] = merged
          const loaded = this.data.hasLoadedTab as boolean[]
          loaded[tabIndex] = true
          const hasMore = newJobs.length >= this.data.pageSize
          
          // 如果当前正在显示这个 tab，立即更新显示
          const updateData: any = { jobsByTab: tabs, hasLoadedTab: loaded, hasMore }
          if (this.data.currentTab === tabIndex) {
            updateData.jobs = merged
            updateData.filteredJobs = merged
          }
          this.setData(updateData)
        } else {
          if (this.data.currentTab === tabIndex) {
            this.setData({ loading: false })
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

        const jobIds = collected.map(row => row?.jobId).filter(Boolean) as string[]
        
        if (jobIds.length === 0) {
          const tabs = this.data.jobsByTab as JobItem[][]
          tabs[2] = []
          const loaded = this.data.hasLoadedTab as boolean[]
          loaded[2] = true
          this.setData({ jobsByTab: tabs, hasLoadedTab: loaded, jobs: [], filteredJobs: [] })
          return
        }

        // 从 remote_jobs collection 查询所有收藏的职位
        const results = await Promise.all(
          jobIds.map(async (id) => {
            try {
              const res = await db.collection('remote_jobs').doc(id).get()
              return { id, data: res.data }
            } catch {
              return null
            }
          })
        )

        const jobByKey = new Map<string, any>()
        for (const r of results) {
          if (!r?.data) continue
          jobByKey.set(r.id, { ...r.data, _id: r.id })
        }

        const merged: ResolvedSavedJob[] = []
        for (const row of collected) {
          const _id = row?.jobId // 从 collected_jobs 集合读取的 jobId 字段（实际是岗位的 _id）
          if (!_id) continue

          const job = jobByKey.get(_id)
          if (!job) continue

          merged.push({
            ...(job as any),
            _id,
            sourceCollection: 'remote_jobs',
          })
        }

        const normalized = mapJobs(merged) as JobItem[]
        const tabs = this.data.jobsByTab as JobItem[][]
        tabs[2] = normalized
        const loaded = this.data.hasLoadedTab as boolean[]
        loaded[2] = true
        
        const updateData: any = { jobsByTab: tabs, hasLoadedTab: loaded }
        // 如果当前在收藏 tab，立即更新显示
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

    stopPropagation() {},


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
        filteredJobs,
      })
    },

    async onDrawerConfirm(e: WechatMiniprogram.CustomEvent) {
      const value = (e.detail?.value || DEFAULT_DRAWER_FILTER) as DrawerFilterValue
      this.updateCurrentTabState({ 
        drawerFilter: { ...DEFAULT_DRAWER_FILTER, ...value }, 
        showDrawer: false,
        scrollTop: 0,
      })
      
      // 应用筛选时重新查询数据库
      const currentState = this.getCurrentTabState()
      const hasKeyword = (currentState.searchKeyword || '').trim()
      
      this.setData({ loading: true })
      
      try {
        if (hasKeyword) {
          // 如果有搜索关键词，使用搜索方法（已包含筛选条件）
          await this.performCollectionSearch(hasKeyword, true)
        } else {
          // 如果没有搜索关键词，直接加载数据
          await this.loadJobsForTab(this.data.currentTab, true)
          const tabs = this.data.jobsByTab as JobItem[][]
          this.setData({
            jobs: tabs[this.data.currentTab] || [],
            filteredJobs: tabs[this.data.currentTab] || [],
            loading: false,
          })
        }
      } catch (err) {
        this.setData({ loading: false })
      }
    },

    async onDrawerReset(e: WechatMiniprogram.CustomEvent) {
      const value = (e.detail?.value || DEFAULT_DRAWER_FILTER) as DrawerFilterValue
      this.updateCurrentTabState({ 
        drawerFilter: { ...DEFAULT_DRAWER_FILTER, ...value }, 
        showDrawer: false,
        scrollTop: 0,
      })
      
      // 重置筛选时重新查询数据库
      const currentState = this.getCurrentTabState()
      const hasKeyword = (currentState.searchKeyword || '').trim()
      
      this.setData({ loading: true })
      
      try {
        if (hasKeyword) {
          // 如果有搜索关键词，使用搜索方法
          await this.performCollectionSearch(hasKeyword, true)
        } else {
          // 如果没有搜索关键词，直接加载数据
          await this.loadJobsForTab(this.data.currentTab, true)
          const tabs = this.data.jobsByTab as JobItem[][]
          this.setData({
            jobs: tabs[this.data.currentTab] || [],
            filteredJobs: tabs[this.data.currentTab] || [],
            loading: false,
          })
        }
      } catch (err) {
        this.setData({ loading: false })
      }
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
