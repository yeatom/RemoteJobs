import { normalizeLanguage, type AppLanguage } from './utils/i18n'
import { bootManager, type BootStatus } from './utils/bootManager'
import { request, callApi, performLogin } from './utils/request'
import { checkIsAuthed } from './utils/util'

App<IAppOption>({
  globalData: {
    user: null as any,
    userPromise: null,
    bootStatus: 'loading' as BootStatus,
    language: 'AIChinese' as AppLanguage,
    _langListeners: new Set<any>(),
    _userListeners: new Set<any>(),
    _splashAnimated: false,
    tabSelected: 1,
    _pageData: {
      jobData: null,
      filterValue: null,
      filterTabIndex: 0,
      filterResult: null,
      filterAction: null,
    },
    systemConfig: {
      isBeta: true,
      isMaintenance: false,
    },
    prefetchedData: {
      publicJobs: null,
      featuredJobs: null,
      memberSchemes: null,
      timestamp: 0,
    },
  },

  onLaunch() {
    console.log('[App] onLaunch');
    
    wx.onError((err) => {
      console.error('[Global Error]', err);
    });

    bootManager.onStatusChange((status) => {
      this.globalData.bootStatus = status;
    });

    this.bootstrap().catch((err: any) => {
      console.error('[App] Bootstrap crash:', err);
    });
  },

  async bootstrap() {
    console.log('[App] Bootstrap sequence started...');
    this.initNetworkListener();

    const coreTasks = [
      this.refreshUser(),
      this.refreshSystemConfig(),
      this.preFetchJobs(),
    ];

    await bootManager.start(coreTasks);

    const user = this.globalData.user;
    const currentStatus = bootManager.getStatus();
    
    if (currentStatus === 'loading' || currentStatus === 'success') {
        if (checkIsAuthed(user)) {
            bootManager.setStatus('success');
        } else if (this.globalData.bootStatus !== 'server-down' && this.globalData.bootStatus !== 'no-network') {
            bootManager.setStatus('unauthorized');
        } else if (currentStatus === 'loading') {
            // 如果加载完成但没有用户数据，判定为未授权
            bootManager.setStatus('unauthorized'); 
        }
    }

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
          if (checkIsAuthed(this.globalData.user)) {
            bootManager.setStatus('success');
          }
        }).catch(() => {});
      }
    });
  },

  async refreshSystemConfig() {
    try {
      const res: any = await request({
        url: '/system-config',
        method: 'POST',
        data: {}
      })
      const config = res?.result || res
      this.globalData.systemConfig = config || { isBeta: true, isMaintenance: false }
    } catch (err) {
      this.globalData.systemConfig = { isBeta: true, isMaintenance: false }
    }
  },

  async preFetchJobs() {
    try {
      const [publicRes, featuredRes, schemesRes] = await Promise.all([
        callApi<any>('getPublicJobList', { page: 1, pageSize: 15 }),
        callApi<any>('getFeaturedJobList', { page: 1, pageSize: 15 }),
        callApi<any>('getMemberSchemes', {})
      ]);

      this.globalData.prefetchedData = {
        publicJobs: publicRes?.result?.jobs || [],
        featuredJobs: featuredRes?.result?.jobs || [],
        memberSchemes: schemesRes?.result?.schemes || [],
        timestamp: Date.now()
      };
    } catch (err) {
      console.error('[App] Pre-fetch failed:', err);
    }
  },

  async refreshUser() {
    try {
      let openid = wx.getStorageSync('user_openid');
      if (!openid) {
        console.log('[App] No openid in storage, attempting silent login...');
        try {
          openid = await performLogin();
          console.log('[App] Silent login successful, openid:', openid);
        } catch (e) {
          console.error('[App] Silent login failed:', e);
        }
      }

      if (!openid) {
        console.log('[App] No openid available after attempt');
        return;
      }

      console.log('[App] Calling loginByOpenid with:', openid);
      const res = await callApi<any>('loginByOpenid', { openid });
      
      if (res.success && res.result && res.result.user) {
        const responseData = res.result;
        console.log('[App] User refreshed successfully:', responseData.user.phone || responseData.user.phoneNumber);
        this.globalData.user = responseData.user;
        
        // Sync language from user profile
        if (responseData.user.language) {
          this.globalData.language = normalizeLanguage(responseData.user.language);
          this.notifyLanguageListeners(this.globalData.language);
        }

        this.notifyUserListeners(this.globalData.user);

        if (responseData.token) {
          wx.setStorageSync('token', responseData.token);
        }
      } else {
        console.warn('[App] loginByOpenid failed or no user:', res.message || 'Unknown error');
      }
    } catch (err) {
      console.error('[App] refreshUser fatal error:', err);
    }
  },

  applyLanguage() {
    // Navigation bar titles are explicitly disabled by user request
  },

  async setLanguage(lang: AppLanguage) {
    const normalized = normalizeLanguage(lang);
    this.globalData.language = normalized;
    if (this.globalData.user) {
      this.globalData.user.language = normalized;
      await callApi('updateUserLanguage', { language: normalized });
    }
    this.notifyLanguageListeners(normalized);
    this.applyLanguage();
  },

  onLanguageChange(fn: (lang: AppLanguage) => void) {
    this.globalData._langListeners.add(fn);
  },

  offLanguageChange(fn: (lang: AppLanguage) => void) {
    this.globalData._langListeners.delete(fn);
  },

  notifyLanguageListeners(lang: AppLanguage) {
    this.globalData._langListeners.forEach((fn: any) => fn(lang));
  },

  notifyUserListeners(user: any) {
    this.globalData._userListeners.forEach((fn: any) => fn(user));
  },

  onUserChange(fn: (user: any) => void) {
    this.globalData._userListeners.add(fn);
  },

  offUserChange(fn: (user: any) => void) {
    this.globalData._userListeners.delete(fn);
  }
})
