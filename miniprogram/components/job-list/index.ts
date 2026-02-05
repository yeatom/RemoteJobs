// miniprogram/components/job-list/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'

Component({
  properties: {
    jobs: {
      type: Array,
      value: [],
    },
    loading: {
      type: Boolean,
      value: false,
    },
    hasMore: {
      type: Boolean,
      value: true,
    },

    // scroll-view passthrough props
    scrollY: {
      type: Boolean,
      value: true,
    },
    scrollTop: {
      type: Number,
      value: 0,
    },
    lowerThreshold: {
      type: Number,
      value: 100,
    },
    scrollWithAnimation: {
      type: Boolean,
      value: true,
    },
    enableBackToTop: {
      type: Boolean,
      value: false,
    },
    enablePassive: {
      type: Boolean,
      value: true,
    },
    className: {
      type: String,
      value: '',
    },

    // Optional: handle opening a job-detail drawer automatically
    enableDetail: {
      type: Boolean,
      value: false,
    },
    detailSelector: {
      type: String,
      value: '',
    },
    // If your pages sometimes need to override which collection to read from,
    // pass a function-like hint is not possible, so we accept a fallback collection name.
    detailCollectionFallback: {
      type: String,
      value: '',
    },

    bottomSpace: {
      type: Number,
      value: 0,
    },
  },

  data: {
    showNoMore: false,
    noMoreVisible: false,
    _prevLoading: true,
    _prevHasMore: true,
    isAIEnglish: false,
    isAIChinese: false,
    isStandardChinese: false,
    ui: {} as any,
  },

  lifetimes: {
    attached() {
      const app = getApp<IAppOption>() as any
      const updateLanguage = () => {
        const lang = normalizeLanguage(app?.globalData?.language)
        this.setData({ 
          isAIEnglish: lang === 'AIEnglish',
          isAIChinese: lang === 'AIChinese',
          isStandardChinese: lang === 'Chinese',
          ui: {
            loading: t('jobs.loading', lang),
            allDataLoaded: t('jobs.allDataLoaded', lang),
            unknownCompany: t('jobs.unknownCompany', lang),
          }
        })
      }
      
      ;(this as any)._langListener = updateLanguage
      if (app?.onLanguageChange) app.onLanguageChange(updateLanguage)
      
      // 初始化
      updateLanguage()
    },

    detached() {
      const app = getApp<IAppOption>() as any
      const listener = (this as any)._langListener
      if (listener && app?.offLanguageChange) app.offLanguageChange(listener)
      ;(this as any)._langListener = null
    },
  },

  observers: {
    'loading,hasMore,jobs': function(loading: boolean, hasMore: boolean, jobs: any[]) {
      // Clear any existing timeout
      const self = this as any
      if (self._noMoreTimer) {
        clearTimeout(self._noMoreTimer)
        self._noMoreTimer = null
      }
      if (self._noMoreFadeOutTimer) {
        clearTimeout(self._noMoreFadeOutTimer)
        self._noMoreFadeOutTimer = null
      }
      if (self._noMoreRemoveTimer) {
        clearTimeout(self._noMoreRemoveTimer)
        self._noMoreRemoveTimer = null
      }

      const prevLoading = this.data._prevLoading
      const prevHasMore = this.data._prevHasMore
      
      // Only show "no more" when:
      // 1. Loading just finished (from true to false)
      // 2. hasMore just became false (from true to false)
      // 3. There are jobs to show
      const shouldShow = !loading && !hasMore && jobs && jobs.length > 0 && 
                        prevLoading && prevHasMore

      if (shouldShow) {
        this.setData({ showNoMore: true }, () => {
          // Trigger fade-in animation
          self._noMoreTimer = setTimeout(() => {
            this.setData({ noMoreVisible: true })
          }, 50)
          // After showing for a while, fade out and remove
          self._noMoreFadeOutTimer = setTimeout(() => {
            this.setData({ noMoreVisible: false }, () => {
              self._noMoreRemoveTimer = setTimeout(() => {
                this.setData({ showNoMore: false })
              }, 300) // Match CSS transition duration
            })
          }, 2000) // Show for 2 seconds
        })
      } else {
        // Hide immediately when loading starts, hasMore becomes true, or jobs become empty
        if (loading || hasMore || !jobs || jobs.length === 0) {
          // If currently visible, fade out first, then remove
          if (this.data.noMoreVisible) {
            this.setData({ noMoreVisible: false }, () => {
              self._noMoreRemoveTimer = setTimeout(() => {
                this.setData({ showNoMore: false })
              }, 300) // Match CSS transition duration
            })
          } else {
            // Not visible, remove immediately
            this.setData({ showNoMore: false })
          }
        }
      }

      // Update previous state
      this.setData({ _prevLoading: loading, _prevHasMore: hasMore })
    },
  },

  detached() {
    // Clean up timers when component is detached
    const self = this as any
    if (self._noMoreTimer) {
      clearTimeout(self._noMoreTimer)
      self._noMoreTimer = null
    }
    if (self._noMoreFadeOutTimer) {
      clearTimeout(self._noMoreFadeOutTimer)
      self._noMoreFadeOutTimer = null
    }
    if (self._noMoreRemoveTimer) {
      clearTimeout(self._noMoreRemoveTimer)
      self._noMoreRemoveTimer = null
    }
  },

  methods: {
    onItemTap(e: WechatMiniprogram.TouchEvent) {
      const job = e.currentTarget.dataset.job
      const id = e.currentTarget.dataset._id

      if (this.data.enableDetail && this.data.detailSelector) {
        const detail = this.selectComponent(this.data.detailSelector as any) as any
        const collection = (job && (job.sourceCollection || job.collection)) || this.data.detailCollectionFallback
        if (detail && typeof detail.open === 'function' && id && collection) {
          detail.open(id, collection)
        }
      }

      this.triggerEvent('itemtap', { job, _id: id })
    },

    onScrollLower(e: any) {
      this.triggerEvent('scrolltolower', e.detail)
    },

    onScroll(e: any) {
      this.triggerEvent('scroll', e.detail)
    },

    onTouchStart() {
      this.triggerEvent('touchstart')
    },

    onTouchEnd() {
      this.triggerEvent('touchend')
    },
  },
})
