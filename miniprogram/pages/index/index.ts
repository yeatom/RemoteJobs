// miniprogram/pages/index/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'
import { toDateMs } from '../../utils/time'
import { isAiChineseUnlocked } from '../../utils/subscription'
import { request, callApi } from '../../utils/request'

Page({
  data: {
    currentTab: 0,
    isFeaturedUnlocked: false,
    featuredScrollEnabled: true,
    selectedCollection: 'remote_jobs',
    showRestoreSheet: false,
    restoreSheetOpen: false,
    savedSearchConditions: [] as any[],
    isRestoreEditing: false,

    ui: {
      tabPublic: '',
      tabFeatured: '',
      tabSaved: '',
      editLabel: '',
      doneLabel: '',
      clearAllLabel: '',
      noSavedSearchConditions: '',
    } as Record<string, string>,
  },

  onLoad() {
      ;(this as any)._langDetach = attachLanguageAware(this, {
        onLanguageRevive: () => {
          this.syncLanguageFromApp()
        const app = getApp<IAppOption>() as any
        const lang = normalizeLanguage(app?.globalData?.language)
        wx.setNavigationBarTitle({ title: '' })
      },
    })

    this.syncLanguageFromApp()
    this.checkFeaturedSubscription()
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
    this.checkFeaturedSubscription()
    
    // 检查是否有筛选结果需要应用
    const pageData = app?.globalData?._pageData
    if (pageData?.filterResult && pageData?.filterAction) {
      const filterResult = pageData.filterResult
      const tabIndex = pageData.filterTabIndex || 0
      const action = pageData.filterAction
      
      // 清除临时数据
      pageData.filterResult = null
      pageData.filterTabIndex = 0
      pageData.filterAction = null
      
      // 应用筛选条件
      setTimeout(() => {
        const tabComponent = this.selectComponent(`#jobTab${tabIndex}`) as any
        if (tabComponent && typeof tabComponent.applyFilter === 'function') {
          if (action === 'reset') {
            tabComponent.applyFilter({ salary: '全部', experience: '全部', source_name: [], region: '全部' })
          } else {
            tabComponent.applyFilter(filterResult)
          }
        }
      }, 100)
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
          editLabel: t('jobs.editLabel', lang),
          doneLabel: t('jobs.doneLabel', lang),
          clearAllLabel: t('jobs.clearAllLabel', lang),
          noSavedSearchConditions: t('jobs.noSavedSearchConditions', lang),
          restoreMenuLabel: t('jobs.restoreSearchLabel', lang),
        },
      })
    },

    checkFeaturedSubscription() {
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      
      const isUnlocked = isAiChineseUnlocked(user)
      this.setData({ isFeaturedUnlocked: isUnlocked, featuredScrollEnabled: isUnlocked })
    },

  onTabTap(e: any) {
    const idx = Number(e.currentTarget.dataset.idx || 0)
    if (idx === this.data.currentTab) return
    
    this.setData({ currentTab: idx })
    
    if (idx === 1) {
      this.checkFeaturedSubscription()
    }
  },

  onSwiperChange(e: any) {
    const idx = e.detail.current || 0
    if (idx === this.data.currentTab) return
    
    this.setData({ currentTab: idx })
    
    if (idx === 1) {
      this.checkFeaturedSubscription()
    }
  },

  onJobTap(e: any) {
    // job-tab 传递的事件格式: { job, _id }
    const job = e?.detail?.job
    const _id = e?.detail?._id || job?._id

    if (!_id || !job) {
      console.warn('onJobTap: missing job or _id', { job, _id, detail: e?.detail })
      return
    }

    // 存储到全局状态并跳转
    const app = getApp<IAppOption>() as any
    if (app?.globalData?._pageData) {
    // 如果从收藏tab打开，确保isSaved为true，避免UI闪烁
    let jobData = { ...job }
    if (this.data.currentTab === 2) {
      jobData.isSaved = true
    }
      app.globalData._pageData.jobData = jobData
    }
    
    wx.navigateTo({
      url: '/pages/job-detail/index',
    })
  },

  onRefreshSaved() {
    // 通知收藏tab刷新数据
    const savedTabComponent = this.selectComponent('#jobTab2') as any
    if (savedTabComponent && typeof savedTabComponent.loadData === 'function') {
      // 如果收藏tab已激活，刷新数据
      if (this.data.currentTab === 2) {
        savedTabComponent.loadData(true)
          } else {
        // 如果收藏tab未激活，标记为未加载，下次激活时会自动加载
        savedTabComponent.setData({ hasLoaded: false })
      }
    }
  },

  onRestoreSearch(e: any) {
      // 检查认证状态
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      const openid = user?.openid
      const isVerified = !!(user && (user.isAuthed || user.phone))
      if (!isVerified || !openid) {
        wx.showToast({ title: '请先绑定手机号', icon: 'none' })
        return
      }

      // 获取当前tab类型
      const tabType = e?.detail?.tabType ?? this.data.currentTab
      this.loadSavedSearchConditions(tabType)
  },

  async loadSavedSearchConditions(tabType: number) {
      const app = getApp<IAppOption>() as any
      const user = app?.globalData?.user
      const openid = user?.openid
    if (!openid) return

      try {
        const res = await callApi('getSavedSearchConditions', {
          tabIndex: tabType,
          openid
        })

        const result = res.result || (res as any)
        const savedConditions = (result.conditions || []) as any[]
        
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
        const lang = normalizeLanguage(app?.globalData?.language)
        const useEnglish = lang === 'English' || lang === 'AIEnglish'
        const EN_SOURCE: Record<string, string> = {
          '全部': 'All',
          'BOSS直聘': 'BOSS Zhipin',
          '智联招聘': 'Zhilian Zhaopin',
        }
        
        // 翻译 tab 名称
        const tabNames = [
          t('jobs.tabPublic', lang),
          t('jobs.tabFeatured', lang),
          t('jobs.tabSaved', lang),
        ]
        
        const formattedConditions = savedConditions.map((condition) => {
          const keyword = condition.searchKeyword || ''
          const filter = condition.drawerFilter || {}
          const tabName = tabNames[tabType] || tabNames[0] // 使用传入的tabType，而不是condition.tabIndex
          
          // 构建描述文本
          const keywordLabel = t('jobs.filterKeywordLabel', lang)
          const regionLabel = t('jobs.filterRegionLabel', lang)
          const sourceLabel = t('jobs.filterSourceLabel', lang)
          const salaryLabel = t('jobs.filterSalaryLabel', lang)
          const noFilterText = t('jobs.noFilterConditions', lang)
          
          const parts: string[] = []
          if (keyword) {
            parts.push(`${keywordLabel}: ${keyword}`)
          }
          if (filter.region && filter.region !== '全部' && tabType !== 0) {
            const regionText = useEnglish 
              ? (filter.region === '国内' ? 'Domestic' : filter.region === '国外' ? 'Abroad' : filter.region === 'web3' ? 'Web3' : filter.region)
              : filter.region
            parts.push(`${regionLabel}: ${regionText}`)
          }
          if (filter.source_name && Array.isArray(filter.source_name) && filter.source_name.length > 0 && tabType !== 0) {
            const validSources = filter.source_name.filter((s: string) => ['BOSS直聘', '智联招聘'].includes(s))
            if (validSources.length > 0) {
              const sourceTexts = validSources.map((s: string) => (useEnglish ? (EN_SOURCE[s] || s) : s))
              parts.push(`${sourceLabel}: ${sourceTexts.join(',')}`)
            }
          }
          if (filter.salary && filter.salary !== '全部') {
            const EN_SALARY: Record<string, string> = {
              '全部': 'All',
              '10k以下': '< 10K',
              '10-20K': '10–20K',
              '20-50K': '20–50K',
              '50K以上': '50K+',
              '项目制/兼职': 'Project/Part-time',
            }
            const salaryText = useEnglish ? (EN_SALARY[filter.salary] || filter.salary) : filter.salary
            parts.push(`${salaryLabel}: ${salaryText}`)
          }
          
          const desc = parts.length > 0 ? parts.join(' | ') : noFilterText
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
        }, 300)
      })
    },

    goToMe() {
      wx.switchTab({
        url: '/pages/me/index'
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
        await callApi('deleteSearchCondition', { id: condition._id })

        setTimeout(() => {
          if (isLastItem) {
            this.closeRestoreSheet()
          } else {
            const collapsingConditions = [...this.data.savedSearchConditions]
            collapsingConditions[index] = { ...collapsingConditions[index], collapsing: true }
            this.setData({ savedSearchConditions: collapsingConditions })

            setTimeout(() => {
              const finalConditions = this.data.savedSearchConditions.filter((_, idx) => idx !== index)
              this.setData({ savedSearchConditions: finalConditions })
            }, 200)
          }
      }, 200)
      } catch (err) {
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

      const lang = normalizeLanguage(app?.globalData?.language)

      wx.showModal({
        title: t('jobs.confirmClearTitle', lang),
        content: t('jobs.confirmClearContent', lang),
        confirmText: t('drawer.confirm', lang),
        cancelText: t('resume.cancel', lang),
        success: async (res) => {
          if (res.confirm) {
            try {
              await callApi('clearAllSearchConditions', { openid })

              this.setData({ savedSearchConditions: [] })
              this.closeRestoreSheet()
              wx.showToast({ title: t('jobs.cleared', lang), icon: 'success' })
            } catch (err) {
              wx.showToast({ title: t('jobs.clearFailed', lang), icon: 'none' })
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

      // 切换到对应的tab
      const tabIndex = selectedCondition.tabIndex ?? this.data.currentTab
      if (tabIndex !== this.data.currentTab) {
        this.setData({ currentTab: tabIndex })
      }

      // 通过selectComponent获取对应的job-tab组件并应用搜索条件
      setTimeout(() => {
        const tabComponent = this.selectComponent(`#jobTab${tabIndex}`) as any
        if (tabComponent && typeof tabComponent.applySearchCondition === 'function') {
          tabComponent.applySearchCondition({
            searchKeyword: selectedCondition.searchKeyword || '',
            drawerFilter: selectedCondition.drawerFilter || {},
          })
        }
      }, 100) // 等待tab切换完成
    },

  onFeaturedSubscribeTap() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)

    wx.showModal({
      title: t('jobs.unlockFeaturedTitle', lang),
      content: t('jobs.unlockFeaturedContent', lang),
      confirmText: t('jobs.goSubscribe', lang),
      cancelText: t('jobs.thinkAgain', lang),
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/me/index' })
        }
      },
    })
  },

  onOpenFilterDrawer(e: any) {
    const tabIndex = e?.detail?.tabIndex ?? this.data.currentTab
    const currentFilter = e?.detail?.filter || { salary: '全部', experience: '全部', source_name: [], region: '全部' }
    
    // 存储到全局状态并跳转
    const app = getApp<IAppOption>() as any
    if (app?.globalData?._pageData) {
      app.globalData._pageData.filterValue = currentFilter
      app.globalData._pageData.filterTabIndex = tabIndex
    }
    
    wx.navigateTo({
      url: '/pages/filter/index',
    })
  },
})
