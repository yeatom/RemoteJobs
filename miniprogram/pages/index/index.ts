import type { JobItem, ResolvedSavedJob } from '../../utils/job'
import { mapJobs, getJobFieldsByLanguage, mapJobFieldsToStandard } from '../../utils/job'
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'
import { toDateMs } from '../../utils/time'
import { matchSalary } from '../../utils/salary'

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
    showRestoreSheet: false,
    restoreSheetOpen: false,
    savedSearchConditions: [] as any[],
    isRestoreEditing: false,

    tabState: [
      {
        searchKeyword: '',
        scrollTop: 0,
        showDrawer: false,
        showSaveMenu: false,
        isSearching: false,
        drawerFilter: { ...DEFAULT_DRAWER_FILTER } as DrawerFilterValue,
      },
      {
        searchKeyword: '',
        scrollTop: 0,
        showDrawer: false,
        showSaveMenu: false,
        isSearching: false,
        drawerFilter: { ...DEFAULT_DRAWER_FILTER } as DrawerFilterValue,
      },
      {
        searchKeyword: '',
        scrollTop: 0,
        showDrawer: false,
        showSaveMenu: false,
        isSearching: false,
        drawerFilter: { ...DEFAULT_DRAWER_FILTER } as DrawerFilterValue,
      },
    ] as Array<{
      searchKeyword: string
      scrollTop: number
      showDrawer: boolean
      showSaveMenu: boolean
      isSearching: boolean
      drawerFilter: DrawerFilterValue
    }>,

    ui: {
      tabPublic: '公开',
      tabFeatured: '精选',
      tabSaved: '收藏',
      featuredSubscribeText: '订阅后查看精选岗位',
      featuredLockedTitle: '精选岗位 🔒',
      searchPlaceholder: '搜索职位名称..',
      filterLabel: '筛选',
      saveMenuLabel: '功能',
      collectAllLabel: '一键收藏当前列表',
      saveSearchLabel: '保存搜索条件',
      restoreSearchLabel: '恢复搜索条件',
      editLabel: '编辑',
      doneLabel: '完成',
      clearAllLabel: '一键清空',
      trySaveSearchHint: '试着保存搜索条件吧',
      tryAddFilterHint: '试着加入筛选条件吧',
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
        // 语言变化时刷新当前显示的 tab 的岗位数据
        const currentTab = this.data.currentTab
        if (currentTab !== undefined) {
          // 标记所有 tab 为未加载，强制重新加载
          const loaded = this.data.hasLoadedTab as boolean[]
          loaded[0] = false
          loaded[1] = false
          loaded[2] = false
          this.setData({ hasLoadedTab: loaded })
          
          // 重新加载当前 tab 的数据
          if (currentTab === 2) {
            // 收藏 tab
            this.loadSavedJobsForTab(true, true).catch(() => {})
          } else {
            // 公开或精选 tab
            this.loadJobsForTab(currentTab, true).catch(() => {})
          }
        }
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
    if (currentState.showSaveMenu) {
      this.updateCurrentTabState({ showSaveMenu: false })
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
        // 已加载过，直接显示已有数据，不刷新
        const savedJobs = tabs[idx] || []
          this.setData({ jobs: savedJobs, filteredJobs: savedJobs, loading: false })
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
    if (currentState.showSaveMenu) {
      this.updateCurrentTabState({ showSaveMenu: false })
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
        // 已加载过，直接显示已有数据，不刷新
        const savedJobs = tabs[idx] || []
          this.setData({ jobs: savedJobs, filteredJobs: savedJobs, loading: false })
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
          tabPublic: t('jobs.tabPublic', lang),
          tabFeatured: t('jobs.tabFeatured', lang),
          tabSaved: t('jobs.tabSaved', lang),
          featuredSubscribeText: t('jobs.featuredSubscribeText', lang),
          featuredLockedTitle: t('jobs.featuredLockedTitle', lang),
          searchPlaceholder: t('jobs.searchPlaceholder', lang),
          filterLabel: t('jobs.filterLabel', lang),
          emptyFavorites: t('me.emptyFavorites', lang),
          saveMenuLabel: t('jobs.saveMenuLabel', lang),
          collectAllLabel: t('jobs.collectAllLabel', lang),
          saveSearchLabel: t('jobs.saveSearchLabel', lang),
          restoreSearchLabel: t('jobs.restoreSearchLabel', lang),
          editLabel: t('jobs.editLabel', lang),
          doneLabel: t('jobs.doneLabel', lang),
          clearAllLabel: t('jobs.clearAllLabel', lang),
          trySaveSearchHint: t('jobs.trySaveSearchHint', lang),
          tryAddFilterHint: t('jobs.tryAddFilterHint', lang),
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
            // 收藏tab清空搜索时，不刷新数据，只更新状态
            this.setData({ loading: false })
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

        // 获取用户语言设置并确定字段名
        const app = getApp<IAppOption>() as any
        const userLanguage = normalizeLanguage(app?.globalData?.language || 'Chinese')
        const { titleField, summaryField, descriptionField, salaryField, sourceNameField } = getJobFieldsByLanguage(userLanguage)

        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const searchRegex = db.RegExp({ regexp: escapedKeyword, options: 'i' })

        // 构建 where 条件，同时包含搜索关键词和筛选条件
        const whereCondition: any = {
          [titleField]: searchRegex,
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
        
        // 根据语言选择字段，只查询需要的字段
        const fieldSelection: any = {
          _id: true,
          createdAt: true,
          source_url: true,
          team: true,
          type: true,
          tags: true,
          [titleField]: true,
          [summaryField]: true,
          [descriptionField]: true,
        }
        
        // 根据语言选择 salary 和 source_name 字段
        if (salaryField) {
          fieldSelection[salaryField] = true
          if (userLanguage === 'AIEnglish' && salaryField !== 'salary') {
            fieldSelection.salary = true
          }
        } else {
          fieldSelection.salary = true
        }
        
        if (sourceNameField) {
          fieldSelection[sourceNameField] = true
          if (userLanguage === 'AIEnglish' && sourceNameField !== 'source_name') {
            fieldSelection.source_name = true
          }
        } else {
          fieldSelection.source_name = true
        }
        
        query = query.field(fieldSelection)
        
        const res = await query
          .orderBy('createdAt', 'desc')
          .get()

        let allJobs = res.data || []
        
        // 将查询的字段名映射回标准字段名
        allJobs = allJobs.map((job: any) => mapJobFieldsToStandard(job, titleField, summaryField, descriptionField, salaryField, sourceNameField))
        
        // 应用薪资筛选（如果指定了薪资条件）
        const salary = currentState.drawerFilter?.salary || '全部'
        if (salary && salary !== '全部') {
          allJobs = allJobs.filter((job: any) => {
            const jobSalary = job.salary || ''
            return matchSalary(jobSalary, salary)
          })
        }
        
        // 分页处理（在薪资筛选之后）
        const paginatedJobs = allJobs.slice(skip, skip + this.data.pageSize)
        const mappedJobs = mapJobs(paginatedJobs, userLanguage) as JobItem[]
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
          hasMore: allJobs.length > skip + mappedJobs.length,
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
      // 如果当前正在显示这个 tab，设置 loading 状态
      const isCurrentTab = this.data.currentTab === tabIndex
      if (isCurrentTab) {
        this.setData({ loading: true })
      }
      
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
        
        // 添加薪资筛选参数
        const salary = currentState.drawerFilter?.salary || '全部'
        if (salary && salary !== '全部') {
          filterParams.salary = salary
        }
        
        // 获取当前语言设置并传递给云函数
        const app = getApp<IAppOption>() as any
        const currentLang = normalizeLanguage(app?.globalData?.language || 'Chinese')
        filterParams.language = currentLang
        
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
          const newJobs = mapJobs(jobs, currentLang) as JobItem[]
          const existing = (this.data.jobsByTab[tabIndex] || []) as JobItem[]
          const merged = reset ? newJobs : [...existing, ...newJobs]

          const tabs = this.data.jobsByTab as JobItem[][]
          tabs[tabIndex] = merged
          const loaded = this.data.hasLoadedTab as boolean[]
          loaded[tabIndex] = true
          const hasMore = newJobs.length >= this.data.pageSize
          
          // 如果当前正在显示这个 tab，立即更新显示
          const updateData: any = { jobsByTab: tabs, hasLoadedTab: loaded, hasMore }
          if (isCurrentTab) {
            updateData.jobs = merged
            updateData.filteredJobs = merged
            updateData.loading = false
          }
          this.setData(updateData)
        } else {
          if (isCurrentTab) {
            this.setData({ loading: false })
          }
        }
      } catch (err) {
        // ignore
        if (isCurrentTab) {
          this.setData({ loading: false })
        }
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

    async loadSavedJobsForTab(showLoading = true, reset = false) {
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      const openid = user?.openid
      const isLoggedIn = !!(user && (user.isAuthed || user.phone))
      if (!isLoggedIn || !openid) {
        const tabs = this.data.jobsByTab as JobItem[][]
        tabs[2] = []
        const loaded = this.data.hasLoadedTab as boolean[]
        loaded[2] = true
        this.setData({ jobsByTab: tabs, hasLoadedTab: loaded, jobs: [], filteredJobs: [], hasMore: false })
        return
      }

      // 只有在当前tab是收藏tab且需要显示loading时才设置loading状态
      if (showLoading && this.data.currentTab === 2) {
      this.setData({ loading: true })
      }
      try {
        const db = wx.cloud.database()

        // 计算skip值（分页）
        const existingJobs = reset ? [] : (this.data.jobsByTab[2] || [])
        const skip = existingJobs.length

        const savedRes = await db
          .collection('saved_jobs')
          .where({ openid })
          .orderBy('createdAt', 'desc')
          .skip(skip)
          .limit(this.data.pageSize)
          .get()

        const savedRecords = (savedRes.data || []) as any[]
        
        // 判断是否还有更多数据
        const hasMore = savedRecords.length >= this.data.pageSize

        if (savedRecords.length === 0) {
          const tabs = this.data.jobsByTab as JobItem[][]
          if (reset) {
          tabs[2] = []
          }
          const loaded = this.data.hasLoadedTab as boolean[]
          loaded[2] = true
          const updateData: any = { jobsByTab: tabs, hasLoadedTab: loaded, hasMore: false }
          if (this.data.currentTab === 2) {
            updateData.jobs = tabs[2] || []
            updateData.filteredJobs = tabs[2] || []
            updateData.loading = false // 确保loading状态被清除
          }
          this.setData(updateData)
          return
        }

        const jobIds = savedRecords.map(row => row?.jobId).filter(Boolean) as string[]
        
        if (jobIds.length === 0) {
          const tabs = this.data.jobsByTab as JobItem[][]
          if (reset) {
          tabs[2] = []
          }
          const loaded = this.data.hasLoadedTab as boolean[]
          loaded[2] = true
          const updateData: any = { jobsByTab: tabs, hasLoadedTab: loaded, hasMore: false }
          if (this.data.currentTab === 2) {
            updateData.jobs = tabs[2] || []
            updateData.filteredJobs = tabs[2] || []
            updateData.loading = false // 确保loading状态被清除
          }
          this.setData(updateData)
          return
        }

        // 获取用户语言设置并确定字段名
        const userLanguage = normalizeLanguage(app?.globalData?.language || 'Chinese')
        const { titleField, summaryField, descriptionField, salaryField, sourceNameField } = getJobFieldsByLanguage(userLanguage)

        // 从 remote_jobs collection 查询所有收藏的职位
        const results = await Promise.all(
          jobIds.map(async (id) => {
            try {
              let query: any = db.collection('remote_jobs').doc(id)
              
              // 根据语言选择字段，只查询需要的字段
              const fieldSelection: any = {
                _id: true,
                createdAt: true,
                source_url: true,
                team: true,
                type: true,
                tags: true,
                [titleField]: true,
                [summaryField]: true,
                [descriptionField]: true,
              }
              
              // 根据语言选择 salary 和 source_name 字段
              if (salaryField) {
                fieldSelection[salaryField] = true
                if (userLanguage === 'AIEnglish' && salaryField !== 'salary') {
                  fieldSelection.salary = true
                }
              } else {
                fieldSelection.salary = true
              }
              
              if (sourceNameField) {
                fieldSelection[sourceNameField] = true
                if (userLanguage === 'AIEnglish' && sourceNameField !== 'source_name') {
                  fieldSelection.source_name = true
                }
              } else {
                fieldSelection.source_name = true
              }
              
              query = query.field(fieldSelection)
              
              const res = await query.get()
              let jobData = res.data
              
              // 将查询的字段名映射回标准字段名
              if (jobData) {
                jobData = mapJobFieldsToStandard(jobData, titleField, summaryField, descriptionField, salaryField, sourceNameField)
              }
              
              return { id, data: jobData }
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
        for (const row of savedRecords) {
          const _id = row?.jobId // 从 saved_jobs 集合读取的 jobId 字段（实际是岗位的 _id）
          if (!_id) continue

          const job = jobByKey.get(_id)
          if (!job) continue

          merged.push({
            ...(job as any),
            _id,
            sourceCollection: 'remote_jobs',
          })
        }

        const normalized = mapJobs(merged, userLanguage) as JobItem[]
        const tabs = this.data.jobsByTab as JobItem[][]
        tabs[2] = reset ? normalized : [...existingJobs, ...normalized]
        const loaded = this.data.hasLoadedTab as boolean[]
        loaded[2] = true
        
        const updateData: any = { jobsByTab: tabs, hasLoadedTab: loaded, hasMore }
        // 如果当前在收藏 tab，立即更新显示
        if (this.data.currentTab === 2) {
          updateData.jobs = tabs[2]
          updateData.filteredJobs = tabs[2]
          updateData.loading = false // 确保loading状态被清除
        }
        this.setData(updateData)
      } catch (err) {
        if (showLoading && this.data.currentTab === 2) {
        wx.showToast({ title: '加载收藏失败', icon: 'none' })
        }
      } finally {
        // 确保loading状态被清除（无论是否设置了showLoading）
        if (this.data.currentTab === 2) {
          this.setData({ loading: false })
        }
      }
    },

    onFeaturedSubscribeTap() {
      wx.showModal({
        title: this.data.ui.featuredLockedTitle || '精选岗位 🔒',
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
        this.setData({ loading: true })
        this.performCollectionSearch(currentState.searchKeyword, false)
        return
      }

      if (this.data.currentTab === 0) {
        this.loadJobsForTab(0, false)
      } else if (this.data.currentTab === 1) {
        this.loadJobsForTab(1, false)
      } else if (this.data.currentTab === 2) {
        // 收藏tab的分页加载
        this.loadSavedJobsForTab(true, false)
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
      // 关闭保存菜单（如果打开）
      if (currentState.showSaveMenu) {
        this.updateCurrentTabState({ showSaveMenu: false })
      }
      this.updateCurrentTabState({ showDrawer: !currentState.showDrawer })
    },

    toggleSaveMenu() {
      const currentState = this.getCurrentTabState()
      // 关闭筛选抽屉（如果打开）
      if (currentState.showDrawer) {
        this.updateCurrentTabState({ showDrawer: false })
      }
      this.updateCurrentTabState({ showSaveMenu: !currentState.showSaveMenu })
    },

    async onSaveAllJobs() {
      // 关闭菜单
      this.updateCurrentTabState({ showSaveMenu: false })

      // 检查登录状态
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      const openid = user?.openid
      const isLoggedIn = !!(user && (user.isAuthed || user.phone))
      if (!isLoggedIn || !openid) {
        wx.showToast({ title: '请先登录/绑定手机号', icon: 'none' })
        return
      }

      // 获取当前tab的职位列表
      const currentJobs = this.data.jobsByTab[this.data.currentTab] || []
      if (currentJobs.length === 0) {
        wx.showToast({ title: '当前列表为空', icon: 'none' })
        return
      }

      wx.showLoading({ title: '收藏中...', mask: true })
      try {
        const db = wx.cloud.database()
        
        // 获取当前用户已收藏的职位ID列表（分页查询以确保获取全部）
        const savedIds = new Set<string>()
        const pageSize = 100
        let hasMore = true
        let skip = 0
        
        while (hasMore) {
          const savedRes = await db
            .collection('saved_jobs')
            .where({ openid })
            .skip(skip)
            .limit(pageSize)
            .get()
          
          const batch = (savedRes.data || []).map((item: any) => item.jobId).filter(Boolean)
          batch.forEach(id => savedIds.add(id))
          
          if (batch.length < pageSize) {
            hasMore = false
          } else {
            skip += pageSize
          }
        }

        // 批量添加未收藏的职位（同时去重当前列表中的重复职位）
        const seenJobIds = new Set<string>()
        const jobsToCheck = currentJobs.filter(job => {
          if (!job._id) return false
          if (seenJobIds.has(job._id)) return false // 列表内重复的跳过
          seenJobIds.add(job._id)
          return true
        })

        // 再次批量查询这些jobId是否已经被收藏（确保数据库状态是最新的）
        const jobIdsToCheck = jobsToCheck.map(job => job._id).filter(Boolean)
        if (jobIdsToCheck.length > 0) {
          const checkRes = await db
            .collection('saved_jobs')
            .where({
              openid,
              jobId: db.command.in(jobIdsToCheck),
            })
            .get()
          
          // 将新查询到的已收藏jobId合并到savedIds中
          const existingJobIds = (checkRes.data || []).map((item: any) => item.jobId)
          existingJobIds.forEach(id => savedIds.add(id))
        }

        const jobsToSave = jobsToCheck.filter(job => !savedIds.has(job._id))
        
        if (jobsToSave.length === 0) {
          wx.hideLoading()
          wx.showToast({ title: '已收藏全部', icon: 'success', duration: 2000 })
          return
        }

        // 使用云函数批量插入，确保去重和性能
        const jobIds = jobsToSave.map(job => job._id).filter(Boolean)
        const jobData: Record<string, { type: string; createdAt: any }> = {}
        jobsToSave.forEach(job => {
          if (job._id) {
            jobData[job._id] = {
              type: job.type || '',
              createdAt: job.createdAt || new Date(),
            }
          }
        })

        const res = await wx.cloud.callFunction({
          name: 'batchSaveJobs',
          data: {
            jobIds,
            jobData,
          },
        })

        let successCount = 0
        if (res.result && (res.result as any).success) {
          const result = res.result as any
          successCount = result.savedCount || 0
        } else {
          wx.hideLoading()
          wx.showToast({ title: '收藏失败', icon: 'none' })
          return
        }

        wx.hideLoading()
        if (successCount === 0) {
          // 如果成功收藏0个，说明所有职位已收藏
          wx.showToast({ 
            title: '已收藏全部', 
            icon: 'success',
            duration: 2000,
          })
        } else {
          wx.showToast({ 
            title: `成功收藏 ${successCount} 个职位`, 
            icon: 'success',
            duration: 2000,
          })
        }

        // 更新职位列表的isSaved状态（只更新成功插入的职位）
        const savedJobIds = new Set(jobsToSave.slice(0, successCount).map(j => j._id))
        const tabs = this.data.jobsByTab as JobItem[][]
        tabs[this.data.currentTab] = tabs[this.data.currentTab].map(job => ({
          ...job,
          isSaved: savedIds.has(job._id) || savedJobIds.has(job._id),
        }))
        this.setData({ jobsByTab: tabs })

        // 刷新收藏列表数据（无论当前在哪个tab，都要更新收藏tab的数据）
        const loaded = this.data.hasLoadedTab as boolean[]
        if (loaded[2]) {
          // 如果收藏tab已加载过，后台刷新数据（不显示loading）
          this.loadSavedJobsForTab(false).catch(() => {})
        }
      } catch (err) {
        wx.hideLoading()
        wx.showToast({ title: '收藏失败', icon: 'none' })
      }
    },

    async onSaveSearchCondition() {
      // 关闭菜单
      this.updateCurrentTabState({ showSaveMenu: false })

      // 检查登录状态
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      const openid = user?.openid
      const isLoggedIn = !!(user && (user.isAuthed || user.phone))
      if (!isLoggedIn || !openid) {
        wx.showToast({ title: '请先登录/绑定手机号', icon: 'none' })
        return
      }

      const currentState = this.getCurrentTabState()
      const searchKeyword = (currentState.searchKeyword || '').trim()
      const drawerFilter = currentState.drawerFilter || { ...DEFAULT_DRAWER_FILTER }
      
      // 检查是否有搜索关键词或筛选条件
      const hasKeyword = !!searchKeyword
      const hasSourceFilter = !!(drawerFilter?.source_name && Array.isArray(drawerFilter.source_name) && drawerFilter.source_name.length > 0)
      const hasRegionFilter = !!(drawerFilter?.region && drawerFilter.region !== '全部')
      const hasSalaryFilter = !!(drawerFilter?.salary && drawerFilter.salary !== '全部')
      const hasExperienceFilter = !!(drawerFilter?.experience && drawerFilter.experience !== '全部')
      const hasAnyFilter = hasSourceFilter || hasRegionFilter || hasSalaryFilter || hasExperienceFilter
      
      // 如果既没有搜索关键词，也没有筛选条件，提示用户
      if (!hasKeyword && !hasAnyFilter) {
        const lang = normalizeLanguage(app?.globalData?.language)
        wx.showToast({ 
          title: t('jobs.tryAddFilterHint', lang), 
          icon: 'none',
          duration: 2000,
        })
        return
      }

      const searchCondition = {
        searchKeyword,
        drawerFilter,
        tabIndex: this.data.currentTab,
      }

      // 使用云数据库保存搜索条件
      try {
        const db = wx.cloud.database()
        const timestamp = Date.now()
        
        // 保存搜索条件
        await db.collection('saved_search_conditions').add({
          data: {
            openid,
            ...searchCondition,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        })

        wx.showToast({ title: '搜索条件已保存', icon: 'success' })
      } catch (err) {
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    },

    async onRestoreSearchCondition() {
      // 关闭菜单
      this.updateCurrentTabState({ showSaveMenu: false })

      // 检查登录状态
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      const openid = user?.openid
      const isLoggedIn = !!(user && (user.isAuthed || user.phone))
      if (!isLoggedIn || !openid) {
        wx.showToast({ title: '请先登录/绑定手机号', icon: 'none' })
        return
      }

      try {
        const db = wx.cloud.database()
        
        // 读取保存的搜索条件列表
        const res = await db
          .collection('saved_search_conditions')
          .where({ openid })
          .orderBy('createdAt', 'desc')
          .limit(20)
          .get()

        const savedConditions = (res.data || []) as any[]
        
        // 如果没有保存的搜索条件，只显示toast，不弹窗
        if (savedConditions.length === 0) {
          const lang = normalizeLanguage(app?.globalData?.language)
          wx.showToast({ 
            title: t('jobs.trySaveSearchHint', lang), 
            icon: 'none',
            duration: 2000,
          })
          return
        }
        
        // 格式化数据用于显示
        const formattedConditions = savedConditions.map((condition) => {
          const keyword = condition.searchKeyword || ''
          const filter = condition.drawerFilter || {}
          const tabNames = ['公开', '精选', '收藏']
          const tabName = tabNames[condition.tabIndex] || '公开'
          
          // 构建描述文本
          const parts: string[] = []
          if (keyword) {
            parts.push(`关键词: ${keyword}`)
          }
          if (filter.region && filter.region !== '全部') {
            parts.push(`区域: ${filter.region}`)
          }
          if (filter.source_name && Array.isArray(filter.source_name) && filter.source_name.length > 0) {
            parts.push(`来源: ${filter.source_name.join(',')}`)
          }
          if (filter.salary && filter.salary !== '全部') {
            parts.push(`薪资: ${filter.salary}`)
          }
          
          const desc = parts.length > 0 ? parts.join(' | ') : '无筛选条件'
          return {
            ...condition,
            title: tabName,
            desc,
          }
        })

        // 显示底部弹窗
        this.setData({
          savedSearchConditions: formattedConditions,
          showRestoreSheet: true,
          isRestoreEditing: false,
        }, () => {
          // 延迟显示动画
          setTimeout(() => {
            this.setData({ restoreSheetOpen: true })
          }, 50)
        })
      } catch (err) {
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    },

    closeRestoreSheet() {
      this.setData({ restoreSheetOpen: false }, () => {
        setTimeout(() => {
          this.setData({ 
            showRestoreSheet: false, 
            savedSearchConditions: [],
            isRestoreEditing: false,
          })
        }, 250)
      })
    },

    toggleRestoreEdit() {
      this.setData({ isRestoreEditing: !this.data.isRestoreEditing })
    },

    async onDeleteRestoreCondition(e: any) {
      const index = e.currentTarget.dataset.index
      const condition = this.data.savedSearchConditions[index]
      if (!condition || !condition._id) return

      const isLastItem = this.data.savedSearchConditions.length === 1

      // 先添加向左滑走的删除动画
      const updatedConditions = [...this.data.savedSearchConditions]
      updatedConditions[index] = { ...updatedConditions[index], deleting: true }
      this.setData({ savedSearchConditions: updatedConditions })

      try {
        const db = wx.cloud.database()
        await db.collection('saved_search_conditions').doc(condition._id).remove()

        // 等待向左滑走动画完成（200ms）
        setTimeout(() => {
          if (isLastItem) {
            // 如果是最后一个item，直接关闭弹窗
            this.closeRestoreSheet()
          } else {
            // 如果不是最后一个，添加降低高度动画
            const collapsingConditions = [...this.data.savedSearchConditions]
            collapsingConditions[index] = { ...collapsingConditions[index], collapsing: true }
            this.setData({ savedSearchConditions: collapsingConditions })

            // 等待降低高度动画完成（200ms）后从列表中移除
            setTimeout(() => {
              const finalConditions = this.data.savedSearchConditions.filter((_, idx) => idx !== index)
              this.setData({ savedSearchConditions: finalConditions })
            }, 200)
          }
        }, 200) // 向左滑走动画时长200ms
      } catch (err) {
        // 如果删除失败，恢复状态
        const restoredConditions = [...this.data.savedSearchConditions]
        restoredConditions[index] = { ...restoredConditions[index], deleting: false, collapsing: false }
        this.setData({ savedSearchConditions: restoredConditions })
        wx.showToast({ title: '删除失败', icon: 'none' })
      }
    },

    async onClearAllRestoreConditions() {
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      const openid = user?.openid
      if (!openid) return

      wx.showModal({
        title: '确认清空',
        content: '确定要删除所有保存的搜索条件吗？',
        confirmText: '确定',
        cancelText: '取消',
        success: async (res) => {
          if (res.confirm) {
            try {
              const db = wx.cloud.database()
              // 查询所有该用户的搜索条件
              const queryRes = await db
                .collection('saved_search_conditions')
                .where({ openid })
                .get()

              const ids = (queryRes.data || []).map((item: any) => item._id).filter(Boolean)
              
              if (ids.length > 0) {
                // 批量删除
                await Promise.all(
                  ids.map((id: string) => db.collection('saved_search_conditions').doc(id).remove())
                )
              }

              // 清空列表并关闭弹窗
              this.setData({ savedSearchConditions: [] })
              this.closeRestoreSheet()
              wx.showToast({ title: '已清空', icon: 'success' })
            } catch (err) {
              wx.showToast({ title: '清空失败', icon: 'none' })
            }
          }
        },
      })
    },

    async onSelectRestoreCondition(e: any) {
      const index = e.currentTarget.dataset.index
      const selectedCondition = this.data.savedSearchConditions[index]
      if (!selectedCondition) return

      // 关闭弹窗
      this.closeRestoreSheet()

      // 应用搜索条件
      const searchKeyword = selectedCondition.searchKeyword || ''
      const drawerFilter = selectedCondition.drawerFilter || { ...DEFAULT_DRAWER_FILTER }
      const tabIndex = selectedCondition.tabIndex ?? this.data.currentTab

      // 如果保存的搜索条件对应的tab与当前tab不同，先切换到对应tab
      if (tabIndex !== this.data.currentTab) {
        this.setData({ currentTab: tabIndex })
      }

      // 更新当前tab的状态
      this.updateCurrentTabState({
        searchKeyword,
        drawerFilter: { ...DEFAULT_DRAWER_FILTER, ...drawerFilter },
        scrollTop: 0,
      })

      // 重新加载数据
      this.setData({ loading: true })
      
      try {
        if (searchKeyword.trim()) {
          // 如果有搜索关键词，使用搜索方法
          await this.performCollectionSearch(searchKeyword, true)
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
        
        wx.showToast({ title: '搜索条件已恢复', icon: 'success' })
      } catch (err) {
        this.setData({ loading: false })
        wx.showToast({ title: '恢复失败', icon: 'none' })
      }
    },

    closeJobDetail() {
      this.setData({ 
        showJobDetail: false,
        selectedJobData: null,
      })
    },

    // 处理职位收藏状态变化事件
    onJobSaveChange(e: any) {
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
        // 后台刷新收藏列表数据（不显示loading）
        this.loadSavedJobsForTab(false).catch(() => {})
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
