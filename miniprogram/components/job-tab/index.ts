// miniprogram/components/job-tab/index.ts
import type { JobItem, ResolvedSavedJob } from '../../utils/job'
import { mapJobs, getJobFieldsByLanguage, mapJobFieldsToStandard } from '../../utils/job'
import { normalizeLanguage, t } from '../../utils/i18n'
import { matchSalary } from '../../utils/salary'
import { request, callApi } from '../../utils/request'

type DrawerFilterValue = {
  salary: string
  experience: string
  source_name?: string[]
  region?: string
}

const DEFAULT_DRAWER_FILTER: DrawerFilterValue = {
  salary: '全部',
  experience: '全部',
  source_name: [],
  region: '全部',
}

Component({
  properties: {
    // tab类型: 0=公开, 1=精选, 2=收藏
    tabType: {
      type: Number,
      value: 0,
    },
    // 是否激活（当前显示的tab）
    active: {
      type: Boolean,
      value: false,
    },
    // 是否精选tab已解锁
    isFeaturedUnlocked: {
      type: Boolean,
      value: false,
    },
    // 精选tab是否允许滚动
    featuredScrollEnabled: {
      type: Boolean,
      value: true,
    },
    // 恢复的搜索条件（用于从父组件传递）
    restoreCondition: {
      type: Object,
      value: undefined,
    },
  },

  data: {
    jobs: [] as JobItem[],
    loading: false,
    hasMore: true,
    pageSize: 15,
    lastLoadTime: 0,
    lowerThreshold: 100,
    
    // tab内部状态
    searchKeyword: '',
    scrollTop: 0,
    showSaveMenu: false,
    isSearching: false,
    drawerFilter: { ...DEFAULT_DRAWER_FILTER } as DrawerFilterValue,
    
    // 是否已加载过
    hasLoaded: false,
    
    // UI文本（国际化）
    ui: {
      searchPlaceholder: '搜索职位名称..',
      filterLabel: '筛选',
      saveMenuLabel: '功能',
      collectAllLabel: '一键收藏当前列表',
      saveSearchLabel: '保存搜索条件',
      restoreSearchLabel: '恢复搜索条件',
      emptyFavorites: '暂无收藏',
      featuredSubscribeText: '订阅后查看精选岗位',
    },
  },

  lifetimes: {
    attached() {
      this.getSystemInfo()
      this.syncLanguageFromApp()
      
      // 监听语言变化
      const app = getApp<IAppOption>() as any
      if (app?.onLanguageChange) {
        ;(this as any)._langListener = () => {
          this.syncLanguageFromApp()
          // 如果已加载，重新加载数据以使用新语言
          if (this.data.hasLoaded) {
            this.loadData(true)
          }
        }
        app.onLanguageChange((this as any)._langListener)
      }
      
      // 如果激活且未加载，则加载数据
      if ((this.properties.active as boolean) && !this.data.hasLoaded) {
        this.loadData(true)
      }
    },
    
    detached() {
      const app = getApp<IAppOption>() as any
      const listener = (this as any)._langListener
      if (listener && app?.offLanguageChange) {
        app.offLanguageChange(listener)
      }
      ;(this as any)._langListener = null
    },
  },

  observers: {
    'active': function(active: boolean) {
      // 当tab激活时，如果未加载则加载数据
      if (active && !this.data.hasLoaded) {
        this.loadData(true)
      }
    },
    'restoreCondition': function(condition: any) {
      // 当收到恢复的搜索条件时，应用它
      if (condition && condition.tabType === (this.properties.tabType as number)) {
        const searchKeyword = condition.searchKeyword || ''
        const drawerFilter = condition.drawerFilter || { ...DEFAULT_DRAWER_FILTER }
        
        this.setData({
          searchKeyword,
          drawerFilter: { ...DEFAULT_DRAWER_FILTER, ...drawerFilter },
          scrollTop: 0,
        })
        
        // 重新加载数据
        this.loadData(true)
        
        // 清空恢复条件，避免重复触发
        this.setData({ restoreCondition: null })
      }
    },
  },

  methods: {
    getSystemInfo() {
      try {
        const windowInfo = wx.getWindowInfo()
        const lowerThreshold = windowInfo.windowHeight / 2
        this.setData({ lowerThreshold })
      } catch (err) {
        // ignore
      }
    },

    syncLanguageFromApp() {
      const app = getApp<IAppOption>() as any
      const lang = normalizeLanguage(app?.globalData?.language)
      
      this.setData({
        ui: {
          searchPlaceholder: t('jobs.searchPlaceholder', lang),
          filterLabel: t('jobs.filterLabel', lang),
          saveMenuLabel: t('jobs.saveMenuLabel', lang),
          collectAllLabel: t('jobs.collectAllLabel', lang),
          saveSearchLabel: t('jobs.saveSearchLabel', lang),
          restoreSearchLabel: t('jobs.restoreSearchLabel', lang),
          emptyFavorites: t('me.emptyFavorites', lang),
          featuredSubscribeText: t('jobs.featuredSubscribeText', lang),
        },
      })
    },

    async loadData(reset = false) {
      if (this.data.loading) return
      
      // 如果是重置加载（如切换语言），立即清空当前列表并显示加载中，避免旧语言数据闪烁
      if (reset) {
        this.setData({ 
          jobs: [], 
          hasMore: true, 
          hasLoaded: false,
          scrollTop: 0 
        })
      }
      
      this.setData({ loading: true })

      // 确保先确定好语言（等待 app.ts 中的 refreshUser 完成）
      const app = getApp<IAppOption>() as any
      if (app?.globalData?.userPromise) {
        await app.globalData.userPromise
        // 重新同步 UI 文本和语言状态
        this.syncLanguageFromApp()
      }

      try {
        const tabType = this.properties.tabType as number
        
        // 如果有搜索关键词，执行搜索
        if (this.data.searchKeyword && this.data.searchKeyword.trim()) {
          await this.performCollectionSearch(this.data.searchKeyword, reset)
          return
        }
        
        if (tabType === 2) {
          // 收藏tab
          await this.loadSavedJobs(reset)
        } else {
          // 公开或精选tab
          await this.loadRemoteJobs(reset)
        }
      } catch (err) {
        console.error('Load data error:', err)
        this.setData({ loading: false, hasMore: true })
      }
    },

    async loadRemoteJobs(reset = false) {
      const existingJobs = reset ? [] : this.data.jobs
      const skip = existingJobs.length
      const tabType = this.properties.tabType as number
      
      // 构建筛选参数
      const filterParams: any = {}
      
      // 来源筛选
      const source_names = this.data.drawerFilter?.source_name || []
      if (Array.isArray(source_names) && source_names.length > 0) {
        filterParams.source_name = source_names
      }
      
      // 薪资筛选
      const salary = this.data.drawerFilter?.salary || '全部'
      if (salary && salary !== '全部') {
        filterParams.salary = salary
      }
      
      // 经验筛选
      const experience = this.data.drawerFilter?.experience || '全部'
      if (experience && experience !== '全部') {
        filterParams.experience = experience
      }
      
      // 语言设置
      const app = getApp<IAppOption>() as any
      const currentLang = normalizeLanguage(app?.globalData?.language || 'Chinese')
      filterParams.language = currentLang
      
      // 根据 tabType 选择不同的云函数
      const cloudFunctionName = tabType === 0 ? 'getPublicJobList' : 'getFeaturedJobList'
      
      const res = await callApi(cloudFunctionName, {
        pageSize: this.data.pageSize,
        skip,
        ...filterParams,
      })
      
      const result = res.result || (res as any)
      if (result && result.ok) {
        const jobs = result.jobs || []
        const newJobs = mapJobs(jobs, currentLang) as JobItem[]
        const merged = reset ? newJobs : [...existingJobs, ...newJobs]
        const hasMore = newJobs.length >= this.data.pageSize
        
        this.setData({
          jobs: merged,
          loading: false,
          hasMore,
          hasLoaded: true,
          lastLoadTime: Date.now(),
        })
        
        if (reset) {
          this.setData({ scrollTop: 0 })
        }
        
        // 通知父组件数据已更新
        this.triggerEvent('dataupdate', { jobs: merged, hasMore })
      } else {
        this.setData({ loading: false, hasMore: true })
      }
    },

    async loadSavedJobs(reset = false) {
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      const openid = user?.openid
      const isVerified = !!(user && (user.isAuthed || user.phone))
      
      if (!isVerified || !openid) {
        this.setData({ 
          jobs: [], 
          loading: false, 
          hasMore: false,
          hasLoaded: true,
        })
        this.triggerEvent('dataupdate', { jobs: [], hasMore: false })
        return
      }
      
      try {
        const existingJobs = reset ? [] : this.data.jobs
        const skip = existingJobs.length
        
        const res = await callApi('getSavedJobs', {
          skip,
          limit: this.data.pageSize,
          openid
        })
        
        const result = res.result || (res as any)
        const savedJobs = (result.jobs || []) as any[]
        const hasMore = savedJobs.length >= this.data.pageSize
        
        // 获取用户语言设置
        const userLanguage = normalizeLanguage(app?.globalData?.language || 'Chinese')
        
        const normalized = mapJobs(savedJobs, userLanguage) as JobItem[]
        const finalJobs = reset ? normalized : [...existingJobs, ...normalized]
        
        this.setData({
          jobs: finalJobs,
          loading: false,
          hasMore,
          hasLoaded: true,
          lastLoadTime: Date.now(),
        })
        
        if (reset) {
          this.setData({ scrollTop: 0 })
        }
        
        this.triggerEvent('dataupdate', { jobs: finalJobs, hasMore })
      } catch (err) {
        console.error('Load saved jobs error:', err)
        this.setData({ loading: false, hasMore: true })
      }
    },

    async performCollectionSearch(keyword: string, reset = false) {
      if (!keyword || !keyword.trim()) {
        this.setData({ loading: false, isSearching: false })
        return
      }
      
      if (reset) {
        this.setData({ isSearching: true, scrollTop: 0 })
      }
      
      try {
        const existingJobs = reset ? [] : this.data.jobs
        const skip = existingJobs.length
        
        // 获取语言和筛选参数
        const app = getApp<IAppOption>() as any
        const userLanguage = normalizeLanguage(app?.globalData?.language || 'Chinese')
        
        const res = await callApi('searchJobs', {
          keyword,
          skip,
          limit: this.data.pageSize,
          tabType: this.properties.tabType,
          drawerFilter: this.data.drawerFilter,
          language: userLanguage
        })
        
        const result = res.result || (res as any)
        const jobs = result.jobs || []
        const hasMore = jobs.length >= this.data.pageSize
        
        const mappedJobs = mapJobs(jobs, userLanguage) as JobItem[]
        const mergedJobs = reset ? mappedJobs : [...existingJobs, ...mappedJobs]
        
        this.setData({
          jobs: mergedJobs,
          loading: false,
          hasMore,
          hasLoaded: true,
          lastLoadTime: Date.now(),
        })
        
        if (reset) {
          this.setData({ scrollTop: 0 })
        }
        
        this.triggerEvent('dataupdate', { jobs: mergedJobs, hasMore })
      } catch (err) {
        wx.showToast({ title: '搜索失败', icon: 'none' })
        if (reset) {
          this.setData({ isSearching: false })
        }
        this.setData({ loading: false })
      }
    },

    async maybeLoadMore() {
      const { loading, hasMore, lastLoadTime } = this.data
      const now = Date.now()
      if (loading || !hasMore || now - lastLoadTime < 500) return
      
      this.setData({ lastLoadTime: now })
      await this.loadData(false)
    },

    onScrollLower() {
      this.maybeLoadMore()
    },

    onItemTap(e: any) {
      // job-list 触发的事件格式: { job, _id }
      // 数据在 e.detail 中
      const job = e.detail?.job
      const id = e.detail?._id
      
      if (!job || !id) {
        console.warn('job-tab onItemTap: missing job or id', { job, id, detail: e.detail })
        return
      }
      
      // 确保 _id 存在
      if (!job._id && id) {
        job._id = id
      }
      
      this.triggerEvent('itemtap', { job, _id: id })
    },

    onSearchInput(e: WechatMiniprogram.Input) {
      const keyword = (e.detail.value || '').trim()
      this.setData({ searchKeyword: keyword })
      
      // 防抖搜索
      const self = this as any
      if (self._searchTimer) {
        clearTimeout(self._searchTimer)
      }
      self._searchTimer = setTimeout(() => {
        const currentKeyword = this.data.searchKeyword.trim()
        if (currentKeyword) {
          this.performCollectionSearch(currentKeyword, true)
        } else {
          this.setData({ isSearching: false })
          this.loadData(true)
        }
      }, 500)
    },

    toggleDrawer() {
      if (this.data.showSaveMenu) {
        this.setData({ showSaveMenu: false })
      }
      // 通知父组件打开 drawer
      this.triggerEvent('openfilter', {
        tabIndex: this.properties.tabType as number,
        filter: this.data.drawerFilter,
      })
    },

    toggleSaveMenu() {
      const showSaveMenu = !this.data.showSaveMenu
      this.setData({ showSaveMenu })
    },

    // 应用筛选条件（由父组件调用）
    applyFilter(filter: DrawerFilterValue) {
      this.setData({ drawerFilter: filter })
      // 重新加载数据
      this.loadData(true)
    },

    async onSaveAllJobs() {
      this.setData({ showSaveMenu: false })
      
      // 检查认证状态
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      const openid = user?.openid
      const isVerified = !!(user && (user.isAuthed || user.phone))
      if (!isVerified || !openid) {
        wx.showToast({ title: '请先绑定手机号', icon: 'none' })
        return
      }
      
      const currentJobs = this.data.jobs
      if (currentJobs.length === 0) {
        wx.showToast({ title: '当前列表为空', icon: 'none' })
        return
      }
      
      wx.showLoading({ title: '收藏中...', mask: true })
      try {
        const db = wx.cloud.database()
        
        // 获取已收藏的职位ID
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
        
        // 去重并筛选未收藏的职位
        const seenJobIds = new Set<string>()
        const jobsToCheck = currentJobs.filter(job => {
          if (!job._id) return false
          if (seenJobIds.has(job._id)) return false
          seenJobIds.add(job._id)
          return true
        })
        
        const jobIdsToCheck = jobsToCheck.map(job => job._id).filter(Boolean)
        if (jobIdsToCheck.length > 0) {
          const checkRes = await db
            .collection('saved_jobs')
            .where({
              openid,
              jobId: db.command.in(jobIdsToCheck),
            })
            .get()
          
          const existingJobIds = (checkRes.data || []).map((item: any) => item.jobId)
          existingJobIds.forEach(id => savedIds.add(id))
        }
        
        const jobsToSave = jobsToCheck.filter(job => !savedIds.has(job._id))
        
        if (jobsToSave.length === 0) {
          wx.hideLoading()
          wx.showToast({ title: '已收藏全部', icon: 'success', duration: 2000 })
          return
        }
        
        // 使用云函数批量插入
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
        
        const res = await callApi('batchSaveJobs', {
          jobIds,
          jobData,
        })
        
        let successCount = 0
        if (res?.result && (res.result as any).success) {
          const result = res.result as any
          successCount = result.savedCount || 0
        } else {
          wx.hideLoading()
          wx.showToast({ title: '收藏失败', icon: 'none' })
          return
        }
        
        wx.hideLoading()
        if (successCount === 0) {
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
        
        // 更新职位列表的isSaved状态
        const savedJobIds = new Set(jobsToSave.slice(0, successCount).map(j => j._id))
        this.setData({
          jobs: this.data.jobs.map(job => ({
            ...job,
            isSaved: savedIds.has(job._id) || savedJobIds.has(job._id),
          }))
        })
        
        // 通知父组件刷新收藏tab
        this.triggerEvent('refreshsaved')
      } catch (err) {
        wx.hideLoading()
        wx.showToast({ title: '收藏失败', icon: 'none' })
      }
    },

    async onSaveSearchCondition() {
      this.setData({ showSaveMenu: false })
      
      // 检查认证状态
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      const openid = user?.openid
      const isVerified = !!(user && (user.isAuthed || user.phone))
      if (!isVerified || !openid) {
        wx.showToast({ title: '请先绑定手机号', icon: 'none' })
        return
      }
      
      const searchKeyword = (this.data.searchKeyword || '').trim()
      const drawerFilter = this.data.drawerFilter || { ...DEFAULT_DRAWER_FILTER }
      
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
        tabIndex: this.properties.tabType as number,
      }
      
      try {
        const db = wx.cloud.database()
        const timestamp = Date.now()
        
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
      this.setData({ showSaveMenu: false })
      
      // 检查认证状态
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      const openid = user?.openid
      const isVerified = !!(user && (user.isAuthed || user.phone))
      if (!isVerified || !openid) {
        wx.showToast({ title: '请先绑定手机号', icon: 'none' })
        return
      }
      
      // 通知父组件显示恢复搜索条件的弹窗
      this.triggerEvent('restoresearch', { tabType: this.properties.tabType as number })
    },

    onFeaturedSubscribeTap() {
      this.triggerEvent('featuresubscribe')
    },

    // 应用搜索条件（由父组件调用）
    applySearchCondition(condition: { searchKeyword: string; drawerFilter: DrawerFilterValue }) {
      const { searchKeyword = '', drawerFilter = { ...DEFAULT_DRAWER_FILTER } } = condition
      
      this.setData({
        searchKeyword,
        drawerFilter: { ...DEFAULT_DRAWER_FILTER, ...drawerFilter },
        scrollTop: 0,
      })
      
      // 重新加载数据
      this.loadData(true)
    },
  },
})
