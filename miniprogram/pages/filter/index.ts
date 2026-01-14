// miniprogram/pages/filter/index.ts

import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'

type DrawerValue = { salary: string; experience: string; source_name?: string[]; region?: string }

// loosen key types to avoid mixed ASCII/non-ASCII literal warnings from tooling
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type SalaryKey = string
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ExpKey = string

const SALARY_KEYS: SalaryKey[] = ['全部', '10k以下', '10-20K', '20-50K', '50K以上', '项目制/兼职']
const EXP_KEYS: ExpKey[] = ['全部', '经验不限', '1年以内', '1-3年', '3-5年', '5-10年', '10年以上']
const REGION_KEYS: string[] = ['全部', '国内', '国外', 'web3']

// 所有来源选项（不再根据区域动态变化）
const ALL_SOURCE_OPTIONS: string[] = ['全部', 'BOSS直聘', '智联招聘', 'Wellfound']

const EN_SALARY: Record<string, string> = {
  '全部': 'All',
  '10k以下': '< 10K',
  '10-20K': '10–20K',
  '20-50K': '20–50K',
  '50K以上': '50K+',
  '项目制/兼职': 'Project/Part-time',
}

const EN_EXP: Record<string, string> = {
  '全部': 'All',
  '经验不限': 'Any',
  '1年以内': '< 1y',
  '1-3年': '1–3y',
  '3-5年': '3–5y',
  '5-10年': '5–10y',
  '10年以上': '10y+',
}

const EN_SOURCE: Record<string, string> = {
  '全部': 'All',
  'BOSS直聘': 'BOSS Zhipin',
  '智联招聘': 'Zhilian Zhaopin',
  'Wellfound': 'Wellfound',
}

Page({
  data: {
    tempValue: { salary: '全部', experience: '全部', source_name: [], region: '全部' } as DrawerValue,

    // internal keys (Chinese)
    salaryOptions: SALARY_KEYS,
    experienceOptions: EXP_KEYS,
    regionOptions: REGION_KEYS,
    sourceOptions: ALL_SOURCE_OPTIONS,

    // display labels
    displaySalaryOptions: [] as string[],
    displayExperienceOptions: [] as string[],
    displayRegionOptions: [] as string[],
    displaySourceOptions: [] as string[],

    // 导航tab相关
    navTabs: [] as Array<{ key: string; label: string }>,

    // 滚动定位
    scrollIntoView: '',
    
    // 当前选中的导航tab索引
    currentNavTab: 0,
    
    // 是否正在手动切换tab（防止滚动监听覆盖手动选择）
    isManualTabSwitch: false,

    sourceSelected: {} as Record<string, boolean>,

    ui: {} as Record<string, string>,
  },

  onLoad() {
    // 从全局状态获取数据
    const app = getApp<IAppOption>() as any
    const filterValue = app?.globalData?._pageData?.filterValue || { salary: '全部', experience: '全部', source_name: [], region: '全部' }
    const tabIndex = app?.globalData?._pageData?.filterTabIndex || 0

    const region = filterValue.region || '全部'
    const source_name = Array.isArray(filterValue.source_name) ? filterValue.source_name : (filterValue.source_name === '全部' ? [] : (filterValue.source_name ? [filterValue.source_name] : []))
    
    // 根据 tabIndex 调整导航和选项
    let navTabs = [
      { key: 'salary', label: '薪资' },
      { key: 'experience', label: '经验' },
      { key: 'region', label: '工作类型' },
      { key: 'source', label: '招聘软件' },
    ]
    let regionOptions = ['全部', '国内', '国外', 'web3']
    
    if (tabIndex === 0) {
      // 公开 tab: 去掉工作类型和招聘软件
      navTabs = navTabs.filter(t => t.key !== 'region' && t.key !== 'source')
    } else if (tabIndex === 1) {
      // 精选 tab: 去掉国内，且国外改名海外
      regionOptions = ['全部', '国外', 'web3']
    }

    // 计算每个来源的选中状态
    const sourceSelected: Record<string, boolean> = {}
    for (const sourceKey of ALL_SOURCE_OPTIONS) {
      if (sourceKey === '全部') {
        sourceSelected[sourceKey] = source_name.length === 0
      } else {
        sourceSelected[sourceKey] = source_name.indexOf(sourceKey) > -1
      }
    }
    
    this.setData({
      tempValue: {
        salary: filterValue.salary || '全部',
        experience: filterValue.experience || '全部',
        source_name: source_name,
        region: region,
      },
      navTabs,
      regionOptions,
      sourceOptions: ALL_SOURCE_OPTIONS,
      sourceSelected: sourceSelected,
      _tabIndex: tabIndex, // 保存tab索引，用于返回时应用筛选
    })

    // 清除临时数据
    if (app?.globalData?._pageData) {
      app.globalData._pageData.filterValue = null
      app.globalData._pageData.filterTabIndex = 0
    }

    // attach language-aware behavior
    ;(this as any)._langDetach = attachLanguageAware(this, {
      onLanguageRevive: () => {
        const app = getApp<IAppOption>() as any
        const lang = normalizeLanguage(app?.globalData?.language)
        wx.setNavigationBarTitle({ title: '' })
        this.syncLanguageFromApp()
      },
    })

    this.syncLanguageFromApp()
  },

  onUnload() {
    const fn = (this as any)._langDetach
    if (typeof fn === 'function') fn()
    ;(this as any)._langDetach = null
  },

  onShow() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    wx.setNavigationBarTitle({ title: '' })
  },

  onNavTabTap(e: any) {
    const key = e.currentTarget.dataset.key
    const index = e.currentTarget.dataset.index
    if (!key || index === undefined) return
    
    if (this.data.currentNavTab === index) {
      return
    }
    
    if (this.data.isManualTabSwitch) {
      return
    }
    
    this.setData({
      isManualTabSwitch: true,
      currentNavTab: index,
    })
    
    this.setData({
      scrollIntoView: `section-${key}`,
    })
    
    setTimeout(() => {
      this.setData({
        scrollIntoView: '',
        isManualTabSwitch: false,
      })
    }, 500)
  },

  onScrollViewScroll(_e: any) {
    if (this.data.isManualTabSwitch) {
      return
    }
    
    if ((this as any)._scrollTimer) {
      clearTimeout((this as any)._scrollTimer)
    }
    
    ;(this as any)._scrollTimer = setTimeout(() => {
      if (this.data.isManualTabSwitch) {
        return
      }
      
      const query = wx.createSelectorQuery()
      
      query.select('#section-salary').boundingClientRect()
      query.select('#section-experience').boundingClientRect()
      query.select('#section-region').boundingClientRect()
      query.select('#section-source').boundingClientRect()
      query.exec((res: any) => {
        if (!res || res.length < 4) return
        
        if (this.data.isManualTabSwitch) {
          return
        }
        
        const sections = [
          { index: 0, rect: res[0] },
          { index: 1, rect: res[1] },
          { index: 2, rect: res[2] },
          { index: 3, rect: res[3] },
        ]
        
        const threshold = 28
        let currentIndex = 0
        
        for (let i = sections.length - 1; i >= 0; i--) {
          if (sections[i].rect && sections[i].rect.top <= threshold) {
            currentIndex = sections[i].index
            break
          }
        }
        
        if (this.data.currentNavTab !== currentIndex) {
          this.setData({
            currentNavTab: currentIndex,
          })
        }
      })
    }, 100)
  },
  
  syncLanguageFromApp() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)

    const useEnglish = lang === 'English' || lang === 'AIEnglish'
    const displaySalaryOptions = (this.data.salaryOptions as SalaryKey[]).map((k) => (useEnglish ? EN_SALARY[k] : k))
    const displayExperienceOptions = (this.data.experienceOptions as ExpKey[]).map((k) => (useEnglish ? EN_EXP[k] : k))
    
    // 区域选项显示处理
    const displayRegionOptions = (this.data.regionOptions || []).map((k) => {
      if (k === '全部') return t('jobs.regionAll', lang)
      if (k === '国内') return t('jobs.regionDomestic', lang)
      if (k === '国外') return t('jobs.regionOverseas', lang)
      if (k === 'web3') return t('jobs.regionWeb3', lang)
      return k
    })
    const displaySourceOptions = (this.data.sourceOptions || []).map((k) => (useEnglish ? (EN_SOURCE[k] || k) : k))

    // 重新根据 data.navTabs 中的 key 来设置 label
    const navTabs = (this.data.navTabs || []).map(tab => {
        let label = tab.label
        if (tab.key === 'salary') label = t('drawer.salary', lang)
        if (tab.key === 'experience') label = t('drawer.experience', lang)
        if (tab.key === 'region') label = t('drawer.regionTitle', lang)
        if (tab.key === 'source') label = t('drawer.sourceTitle', lang)
        return { ...tab, label }
    })

    this.setData({
      displaySalaryOptions,
      displayExperienceOptions,
      displayRegionOptions,
      displaySourceOptions,
      navTabs,
      ui: {
        salaryTitle: t('drawer.salary', lang),
        experienceTitle: t('drawer.experience', lang),
        regionTitle: t('drawer.regionTitle', lang),
        sourceTitle: t('drawer.sourceTitle', lang),
        clear: t('drawer.clear', lang),
        confirm: t('drawer.confirm', lang),
      },
    })
  },

  onPickSalary(e: any) {
    const value = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.value) || '全部'
    this.setData({ tempValue: { ...this.data.tempValue, salary: value } })
  },

  onPickExperience(e: any) {
    const value = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.value) || '全部'
    this.setData({ tempValue: { ...this.data.tempValue, experience: value } })
  },

  onPickSource(e: any) {
    const value = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.value) as string
    if (!value) return
    
    let currentSource = this.data.tempValue.source_name || []
    if (!Array.isArray(currentSource)) {
      currentSource = currentSource === '全部' ? [] : (currentSource ? [currentSource] : [])
    }
    
    let newSource: string[]
    if (value === '全部') {
      newSource = []
    } else {
      const index = currentSource.indexOf(value)
      if (index > -1) {
        newSource = currentSource.filter(s => s !== value)
        if (newSource.length === 0) {
          newSource = []
        }
      } else {
        if (currentSource.length === 0) {
          newSource = [value]
        } else {
          newSource = [...currentSource, value]
        }
      }
    }
    
    const sourceSelected: Record<string, boolean> = {}
    for (const sourceKey of this.data.sourceOptions) {
      if (sourceKey === '全部') {
        sourceSelected[sourceKey] = newSource.length === 0
      } else {
        sourceSelected[sourceKey] = newSource.indexOf(sourceKey) > -1
      }
    }
    
    this.setData({ 
      'tempValue.source_name': newSource,
      sourceSelected: sourceSelected,
    })
  },

  onPickRegion(e: any) {
    const value = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.value) || '全部'
    const newRegion = value === '全部' ? '全部' : value
    
    this.setData({ tempValue: { ...this.data.tempValue, region: newRegion } })
  },

  onReset() {
    const value = { salary: '全部', experience: '全部', source_name: [], region: '全部' }
    
    const sourceSelected: Record<string, boolean> = {}
    for (const sourceKey of ALL_SOURCE_OPTIONS) {
      sourceSelected[sourceKey] = sourceKey === '全部'
    }
    
    this.setData({ 
      tempValue: value,
      sourceSelected: sourceSelected,
    })
    
    // 存储到全局状态并返回
    const app = getApp<IAppOption>() as any
    if (app?.globalData?._pageData) {
      app.globalData._pageData.filterResult = value
      app.globalData._pageData.filterTabIndex = (this as any).data._tabIndex || 0
      app.globalData._pageData.filterAction = 'reset'
    }
    
    wx.navigateBack()
  },

  onConfirm() {
    // 存储到全局状态并返回
    const app = getApp<IAppOption>() as any
    if (app?.globalData?._pageData) {
      app.globalData._pageData.filterResult = { ...this.data.tempValue }
      app.globalData._pageData.filterTabIndex = (this as any).data._tabIndex || 0
      app.globalData._pageData.filterAction = 'confirm'
    }
    
    wx.navigateBack()
  },
})

