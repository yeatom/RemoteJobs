// app.ts
import { normalizeLanguage, type AppLanguage, t } from './utils/i18n'
import { request, callApi } from './utils/request'
import { StatusCode } from './utils/statusCodes'
import { bootManager, type BootStatus } from './utils/bootManager'

type LangListener = (lang: AppLanguage) => void

App<IAppOption>({
  globalData: {
    user: null as any,
    userPromise: null as Promise<any> | null,
    bootStatus: 'loading' as BootStatus,
    language: 'Chinese' as AppLanguage,
    _langListeners: new Set<LangListener>(),
    _splashAnimated: false, // 追踪当前 session 是否已展示过开屏动画
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
    wx.hideTabBar({ animation: false }).catch(() => {});

    // 2. 挂载 BootManager 广播监听
    bootManager.onStatusChange((status) => {
        (this as any).globalData.bootStatus = status;
    });

    // 3. 启动核心初始化流程 (大厂级多任务编排)
    (this as any).bootstrap();
  },

  /**
   * 核心启动函数：编排所有初始化任务
   */
  async bootstrap() {
    console.log('[App] Bootstrap sequence started...');

    // 任务1：基础配置 (无网络监听)
    this.initNetworkListener();

    // 任务2：编排核心并发任务
    const coreTasks = [
      this.refreshUser(), // 获取用户信息、Token 及 语言设置
      this.refreshSystemConfig(), // 获取系统配置（Beta/维护状态）
    ];

    // 通过 BootManager 统一驱动生命周期
    await bootManager.start(coreTasks);

    // 任务3：判定最终状态
    const user = (this as any).globalData.user;
    const currentStatus = bootManager.getStatus();
    
    if (currentStatus === 'loading' || currentStatus === 'success') {
        if (user && user.phone) {
            bootManager.setStatus('success');
        } else if ((this as any).globalData.bootStatus !== 'server-down' && (this as any).globalData.bootStatus !== 'no-network') {
            bootManager.setStatus('unauthorized');
        }
    }

    // 任务4：确保 UI 语言已应用
    this.applyLanguage();
    console.log('[App] Bootstrap complete.');
  },

  initNetworkListener() {
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType === 'none') {
          bootManager.setStatus('no-network');
        }
      }
    });

    wx.onNetworkStatusChange((res) => {
      if (res.isConnected && bootManager.getStatus() === 'no-network') {
        bootManager.setStatus('loading');
        this.refreshUser().then(() => {
          if ((this as any).globalData.user?.phone) {
            bootManager.setStatus('success');
          }
        }).catch(() => {});
      }
    });
  },

  onShow() {
    // 每次进入小程序都确保用户已登录 (静默刷新，不走全量 bootstrap)
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
        bootManager.setStatus('server-down');
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
    bootManager.setStatus('loading');
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
      const authRes: any = await callApi('loginByOpenid', { openid });

      if (authRes && authRes.success && authRes.data && authRes.data.user) {
          // Logged In Successfully
          const user = authRes.data.user;
          const token = authRes.data.token;
          
          wx.setStorageSync('token', token);
          (this as any).globalData.user = user;

           // 检查会员状态并更新 (Optional, adapted from old code)
            try {
                const memberStatusRes: any = await callApi('checkMemberStatus', {})
                const result = memberStatusRes?.result || memberStatusRes
                if (result?.success && result.membership && (this as any).globalData.user) {
                   (this as any).globalData.user.membership = result.membership
                }
            } catch (err) {}

          // Normalize language
          const lang = normalizeLanguage(user?.language);
          (this as any).globalData.language = lang;
          
          return user;

      } else {
          // Not Logged In (OpenID not bound)
          console.log('[Auth] User not found or not bound, redirecting to Login Wall');
          throw new Error('AUTH_REQUIRED');
      }

    } catch (err: any) {
      console.log('[Auth] Error in refreshUser:', err);
      
      const statusCode = err.statusCode || (err.response && err.response.statusCode) || (err.data && err.data.code);
      const bizCode = err.data && err.data.code;

      // 1. 检查是否是微信底层报告的网络错误（无连接/超时）
      if (err.errMsg && (err.errMsg.includes('timeout') || err.errMsg.includes('fail'))) {
        const network = await new Promise(r => wx.getNetworkType({ success: r }));
        if ((network as any).networkType === 'none') {
          bootManager.setStatus('no-network');
        } else {
          // 有网但请求失败（可能是 DNS 错误或服务器彻底宕机连不上的）
          bootManager.setStatus('server-down');
        }
      } 
      // 2. 检查具体的商业状态码或 HTTP 状态码
      else if (bizCode === StatusCode.USER_NOT_FOUND || statusCode === 404) {
        // 用户不存在（新用户），在 Auth 系统中视为“未授权”状态以触发登录墙
        bootManager.setStatus('unauthorized');
      }
      else if (bizCode === StatusCode.UNAUTHORIZED || bizCode === StatusCode.INVALID_TOKEN || statusCode === 401 || statusCode === 403 || err.message === 'AUTH_REQUIRED') {
        // 正常的“未登录”状态
        bootManager.setStatus('unauthorized');
      } 
      else if (statusCode >= 500 || bizCode === StatusCode.INTERNAL_ERROR) {
        bootManager.setStatus('server-down');
      }
      else {
        // 其他未知错误，安全起见引导至登录页
        bootManager.setStatus('unauthorized');
      }

      this.globalData.user = null;
      return null;
    }
  },
})
