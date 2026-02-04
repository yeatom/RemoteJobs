// app.ts
import { normalizeLanguage, type AppLanguage, t } from './utils/i18n'
import { request, callApi } from './utils/request'

type LangListener = (lang: AppLanguage) => void

App<IAppOption>({
  globalData: {
    user: null as any,
    userPromise: null as Promise<any> | null,
    bootStatus: 'loading' as 'loading' | 'success' | 'error' | 'no-network' | 'server-down' | 'unauthorized',
    language: 'Chinese' as AppLanguage,
    _langListeners: new Set<LangListener>(),
    // 页面跳转临时数据存储
    _pageData: {
      jobData: null as any,
      filterValue: null as any,
      filterTabIndex: 0,
      filterResult: null as any, // 筛选结果
      filterAction: null as string | null, // 'confirm' | 'reset' | null
    },
  } as any,

  async onLaunch() {
    // 1. 强制隐藏 TabBar 防止闪烁
    wx.hideTabBar({ animated: false }).catch(() => {});

    // 2. 监听网络状态
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType === 'none') {
          this.globalData.bootStatus = 'no-network';
        }
      }
    });

    wx.onNetworkStatusChange((res) => {
      if (res.isConnected && this.globalData.bootStatus === 'no-network') {
        this.globalData.bootStatus = 'loading';
        this.refreshUser().catch(() => {});
      }
    });

    this.refreshSystemConfig()
    this.applyLanguage()

    // 3. 执行核心 Auth 逻辑
    this.globalData.userPromise = this.refreshUser().then(user => {
        if (user && user.phoneNumber) {
            this.globalData.bootStatus = 'success';
            wx.showTabBar({ animated: true }).catch(() => {});
        } else {
            // 如果 refreshUser 返回了 null，说明是主动抛出的或是网络错误
            // 这里我们根据 globalData.bootStatus 是否被网络监听器改写来判断
            if (this.globalData.bootStatus !== 'no-network') {
                // 如果不是明确的没网，可能是没登录或接口报错
                this.globalData.bootStatus = 'unauthorized';
            }
        }
        return user;
    }).catch(err => {
        console.error('[Launch] Auth fatal error:', err);
        this.globalData.bootStatus = 'error';
        return null;
    });

    await this.globalData.userPromise
    
    // ... rest of logic

    const lang = ((this as any).globalData.language || 'Chinese') as AppLanguage
    this.applyLanguage()
    this.emitLanguageChange(lang)
  },

  onShow() {
    // 每次进入小程序都确保用户已登录
    const user = this.globalData.user;
    if (user) {
        this.refreshUser().catch(() => null)
    }
  },

  async refreshSystemConfig() {
    try {
      const res: any = await request({
        url: '/system-config',
        method: 'POST',
        data: {}
      })
      const config = res?.result?.data || res?.data || res
      
      this.globalData.systemConfig = config || { isBeta: true, isMaintenance: false }

      if (config && config.isMaintenance) {
        const lang = normalizeLanguage(this.globalData.language)
        const msg = config.maintenanceMessage || t('app.maintenanceMsg', lang)
        wx.reLaunch({
          url: '/pages/logs/logs?mode=maintenance&msg=' + encodeURIComponent(msg)
        })
      }
    } catch (err) {
      this.globalData.systemConfig = { isBeta: true, isMaintenance: false }
    }
  },

  applyLanguage() {
    const lang = ((this as any).globalData.language || 'Chinese') as AppLanguage

    // Tabbar text
    try {
      wx.setTabBarItem({ index: 0, text: t('tab.positions', lang) })
      wx.setTabBarItem({ index: 1, text: t('tab.jobs', lang) })
      wx.setTabBarItem({ index: 2, text: t('tab.me', lang) })
    } catch {
      // ignore
    }

    try {
      wx.setNavigationBarTitle({ title: '' })
    } catch {
      // ignore
    }
  },

  onLanguageChange(cb: LangListener) {
    ;(this as any).globalData._langListeners.add(cb)
  },

  offLanguageChange(cb: LangListener) {
    ;(this as any).globalData._langListeners.delete(cb)
  },

  emitLanguageChange(lang: AppLanguage) {
    const set: Set<LangListener> = (this as any).globalData._langListeners
    if (!set) return
    set.forEach((fn) => {
      try {
        fn(lang)
      } catch (e) {
        // ignore
      }
    })
  },

  async setLanguage(language: AppLanguage) {
    ;(this as any).globalData.language = language
    this.applyLanguage()
    this.emitLanguageChange(language)

    try {
      const res = await callApi('updateUserLanguage', { language })
      const updatedUser = res?.result?.user || (res as any)?.user
      if (updatedUser) {
        ;(this as any).globalData.user = updatedUser
      }
    } catch (err) {
      // ignore
    }
  },

  async refreshUser() {
    this.globalData.bootStatus = 'loading';
    try {
      // 1. Get Code
      const { code } = await wx.login()

      // 2. Exchange for OpenID
      // Note: Backend /api/login now returns openid but DOES NOT create user
      const loginRes: any = await callApi('login', { code })
      const openid = loginRes?.result?.openid || loginRes?.openid
      
      if (!openid) throw new Error('Failed to get OpenID');
      wx.setStorage({ key: 'user_openid', data: openid });

      // 3. Try "Silent Login" with OpenID
      // New Auth System: Check if this openid is bound to a user
      const authRes: any = await callApi('auth/loginByOpenid', { openid }).catch(err => {
         // suppress 404/401 here to handle below
         return { success: false };
      });

      if (authRes && authRes.success && authRes.data && authRes.data.user) {
          // Logged In Successfully
          const user = authRes.data.user;
          const token = authRes.data.token;
          
          wx.setStorageSync('token', token);
          this.globalData.user = user;

           // 检查会员状态并更新 (Optional, adapted from old code)
            try {
                const memberStatusRes: any = await callApi('checkMemberStatus', {})
                const result = memberStatusRes?.result || memberStatusRes
                if (result?.success && result.membership) {
                   this.globalData.user.membership = result.membership
                }
            } catch (err) {}

          // Normalize language
          const lang = normalizeLanguage(user?.language)
          this.globalData.language = lang
          
          return user;

      } else {
          // Not Logged In (OpenID not bound)
          console.log('[Auth] User not found or not bound, redirecting to Login Wall');
          throw new Error('AUTH_REQUIRED');
      }

    } catch (err: any) {
      console.log('[Auth] Error in refreshUser:', err.message || err);
      
      // 1. 先检查是否是微信底层报告的网络错误
      if (err.errMsg && (err.errMsg.includes('timeout') || err.errMsg.includes('fail'))) {
        // 进一步判断是完全没网，还是服务器炸了
        const network = await new Promise(r => wx.getNetworkType({ success: r }));
        if ((network as any).networkType === 'none') {
          this.globalData.bootStatus = 'no-network';
        } else {
          this.globalData.bootStatus = 'server-down';
        }
      } else if (err.statusCode && err.statusCode >= 500) {
        // 2. 服务器返回了 5xx 错误
        this.globalData.bootStatus = 'server-down';
      } else {
        // 3. 其他错误（如 404/401 等）统一视为未授权/需登录
        this.globalData.bootStatus = 'unauthorized';
      }

      this.globalData.user = null;
      return null;
    }
  },
})
