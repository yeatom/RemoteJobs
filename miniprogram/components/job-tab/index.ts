// miniprogram/components/job-tab/index.ts
import type { JobItem } from '../../utils/job'
import { mapJobs } from '../../utils/job'
import { normalizeLanguage } from '../../utils/i18n'

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
    showDrawer: false,
    showSaveMenu: false,
    isSearching: false,
    drawerFilter: { ...DEFAULT_DRAWER_FILTER } as DrawerFilterValue,
    
    // 是否已加载过
    hasLoaded: false,
  },

  lifetimes: {
    attached() {
      this.getSystemInfo()
      // 如果激活且未加载，则加载数据
      if (this.data.active && !this.data.hasLoaded) {
        this.loadData(true)
      }
    },
  },

  observers: {
    'active': function(active: boolean) {
      // 当tab激活时，如果未加载则加载数据
      if (active && !this.data.hasLoaded) {
        this.loadData(true)
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

    async loadData(reset = false) {
      if (this.data.loading) return
      
      this.setData({ loading: true })
      
      try {
        const tabType = this.data.tabType
        const existingJobs = reset ? [] : this.data.jobs
        const skip = existingJobs.length
        
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
      const tabType = this.data.tabType
      
      // 构建筛选参数
      const filterParams: any = {}
      
      if (tabType === 1) {
        // 精选 tab：查询所有区域
        filterParams.types = ['国内', '国外', 'web3']
      } else {
        // 公开 tab：使用 drawerFilter 中的区域筛选
        const region = this.data.drawerFilter?.region || '全部'
        if (region !== '全部') {
          filterParams.types = [region]
        } else {
          filterParams.types = ['国内', '国外', 'web3']
        }
      }
      
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
      
      // 语言设置
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
        const merged = reset ? newJobs : [...existingJobs, ...newJobs]
        const hasMore = newJobs.length >= this.data.pageSize
        
        this.setData({
          jobs: merged,
          loading: false,
          hasMore,
          hasLoaded: true,
          lastLoadTime: Date.now(),
        })
        
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
      const isLoggedIn = !!(user && (user.isAuthed || user.phone))
      
      if (!isLoggedIn || !openid) {
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
        const db = wx.cloud.database()
        const existingJobs = reset ? [] : this.data.jobs
        const skip = existingJobs.length
        
        const savedRes = await db
          .collection('saved_jobs')
          .where({ openid })
          .orderBy('createdAt', 'desc')
          .skip(skip)
          .limit(this.data.pageSize)
          .get()
        
        const savedRecords = (savedRes.data || []) as any[]
        const hasMore = savedRecords.length >= this.data.pageSize
        
        if (savedRecords.length === 0) {
          this.setData({
            jobs: reset ? [] : existingJobs,
            loading: false,
            hasMore: false,
            hasLoaded: true,
          })
          this.triggerEvent('dataupdate', { jobs: reset ? [] : existingJobs, hasMore: false })
          return
        }
        
        // 获取job详情（简化版，实际需要根据语言选择字段）
        const jobIds = savedRecords.map(row => row?.jobId).filter(Boolean) as string[]
        const userLanguage = normalizeLanguage(app?.globalData?.language || 'Chinese')
        
        // 这里简化处理，实际应该像原代码一样处理字段映射
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
        
        const merged: any[] = []
        for (const row of savedRecords) {
          const _id = row?.jobId
          if (!_id) continue
          const result = results.find(r => r?.id === _id)
          if (result?.data) {
            merged.push({ ...result.data, _id, sourceCollection: 'remote_jobs' })
          }
        }
        
        const normalized = mapJobs(merged, userLanguage) as JobItem[]
        const finalJobs = reset ? normalized : [...existingJobs, ...normalized]
        
        this.setData({
          jobs: finalJobs,
          loading: false,
          hasMore,
          hasLoaded: true,
          lastLoadTime: Date.now(),
        })
        
        this.triggerEvent('dataupdate', { jobs: finalJobs, hasMore })
      } catch (err) {
        console.error('Load saved jobs error:', err)
        this.setData({ loading: false, hasMore: true })
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

    onItemTap(e: WechatMiniprogram.TouchEvent) {
      const job = e.currentTarget.dataset.job
      const id = e.currentTarget.dataset._id
      this.triggerEvent('itemtap', { job, _id: id })
    },

    onSearchInput(e: WechatMiniprogram.Input) {
      const keyword = (e.detail.value || '').trim()
      this.setData({ searchKeyword: keyword })
      this.triggerEvent('searchinput', { keyword })
    },

    toggleDrawer() {
      const showDrawer = !this.data.showDrawer
      this.setData({ showDrawer })
      this.triggerEvent('toggledrawer', { show: showDrawer })
    },

    toggleSaveMenu() {
      const showSaveMenu = !this.data.showSaveMenu
      this.setData({ showSaveMenu })
      this.triggerEvent('togglesavemenu', { show: showSaveMenu })
    },

    onDrawerConfirm(e: any) {
      const filter = e.detail.value || {}
      this.setData({ drawerFilter: filter, showDrawer: false })
      this.triggerEvent('drawerconfirm', { filter })
      // 重新加载数据
      this.loadData(true)
    },

    onDrawerReset() {
      this.setData({ 
        drawerFilter: { ...DEFAULT_DRAWER_FILTER },
        showDrawer: false 
      })
      this.triggerEvent('drawerreset')
      // 重新加载数据
      this.loadData(true)
    },
  },
})

