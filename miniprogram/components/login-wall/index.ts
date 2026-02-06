import { callApi } from '../../utils/request';
import { InternalPhase, AuthState, SuccessMode, TIMINGS } from './constants';
import { getCeremonyConfig, executeFadeOut } from './ceremonies';
import { checkIsAuthed } from '../../utils/util';
import { t } from '../../utils/i18n/index';

Component({
  properties: {
    visible: {
      type: Boolean,
      value: true, 
      observer(newVal) {
        console.log('[LoginWall] Visible property changed:', newVal);
        if (newVal) {
          this.startFlow();
        } else {
           if (this.data._flowStarted) return;
           this.setData({ _shouldShow: false });
        }
      }
    }
  },

  data: {
    internalPhase: 'hidden' as InternalPhase,
    bootStatus: 'loading',
    errorMsg: '',
    errorDesc: '',
    _flowStarted: false,
    _shouldShow: false,
    
    authState: 'idle' as AuthState,
    authButtonText: t('me.authButton'),
    successMode: '' as SuccessMode 
  },

  lifetimes: {
    attached() {
      const app = getApp<any>();
      
      // 监听语言变化
      if (app?.onLanguageChange) {
        ;(this as any)._langListener = () => {
          this.setData({
            authButtonText: t('me.authButton')
          })
        }
        app.onLanguageChange((this as any)._langListener)
      }

      const { user, bootStatus } = app.globalData;
      if (checkIsAuthed(user) && bootStatus === 'success') {
          this.setData({ 
              internalPhase: 'hidden', 
              _shouldShow: false,
              authState: 'success'
          });
          return;
      }
      this.startFlow();
    },

    detached() {
      const app = getApp<IAppOption>() as any
      const listener = (this as any)._langListener
      if (listener && app?.offLanguageChange) {
        app.offLanguageChange(listener)
      }
      ;(this as any)._langListener = null
    }
  },

  methods: {
    async startFlow() {
      if (this.data._flowStarted) return;
      
      const app = getApp<any>();
      const hasShownSplash = app.globalData._splashAnimated;

      // 逻辑还原：
      // 冷启动统一展示 Splash (遮挡加载过程)，无论是否有 OpenID。
      // 这样给 App.bootstrap 留出静默登录的时间。
      this.setData({ 
        _flowStarted: true,
        _shouldShow: !hasShownSplash,
        internalPhase: hasShownSplash ? 'hidden' : 'splash'
      });

      if (!hasShownSplash) app.globalData._splashAnimated = true;

      const checkState = () => {
        const _app = getApp<any>();
        const { bootStatus } = _app.globalData;
        
        if (this.data.bootStatus !== bootStatus) {
            this.setData({ bootStatus });
        }

        if (bootStatus === 'loading') {
          setTimeout(checkState, TIMINGS.MIN_CHECK_INTERVAL);
          return;
        }

        if (bootStatus === 'success') {
          // 已经展示过开屏且当前是静默登录成功，说明是 Tab 切换场景
          // 直接触发事件，不再展示重复的 40vw 仪式
          if (hasShownSplash && !this.data._shouldShow) {
            this.triggerEvent('loginSuccess', _app.globalData.user);
            return;
          }

          // 场景：首次进入且静默登录成功，展示仪式 (40vw 纯白渐变)
          const config = getCeremonyConfig(false);
          this.setData({ 
            _shouldShow: true, // 确保容器可见
            successMode: config.mode,
            internalPhase: config.phase 
          });
          
          setTimeout(() => {
            executeFadeOut(this, () => {
              this.triggerEvent('loginSuccess', _app.globalData.user);
            });
          }, config.stayTime);
        } 
        else if (['no-network', 'server-down', 'error'].includes(bootStatus)) {
          setTimeout(() => {
            const currentStatus = _app.globalData.bootStatus;
            if (['no-network', 'server-down', 'error'].includes(currentStatus)) {
              _app.refreshUser().then(checkState).catch(checkState);
            } else {
              checkState();
            }
          }, TIMINGS.RETRIAL_CYCLE);
        }
        else {
          console.log('[LoginWall] Unauthorized, showing login immediately');
          this.setData({ 
             internalPhase: 'login',
             _shouldShow: true // CRITICAL FIX: Ensure wall is visible if auth is needed, even if splash was skipped
          });
        }
      };

      checkState();
    },

    async onGetPhoneNumber(e: any) {
      const { detail } = e;
      if (!detail.code) return;

      this.setData({ authState: 'loading' });

      try {
        const app = getApp<any>();
        // 调用后端换取手机号与 Token
        const res: any = await callApi('getPhoneNumber', { code: detail.code });

        if (res?.success && res.result?.token) {
          wx.setStorageSync('token', res.result.token);
          
          // 执行全局刷新，确保全局 globalData.user 同步
          await app.refreshUser();

          // 手动登录路径仪式触发 (30vw + 3s hold)
          const config = getCeremonyConfig(true); 
          
          this.setData({ 
            successMode: config.mode,
            internalPhase: config.phase 
          });

          // 3 秒展示后同步淡出
          setTimeout(() => {
             this.setData({ authState: 'success' }); // 触发登录墙卡片淡出
             executeFadeOut(this, () => {
                this.triggerEvent('loginSuccess', app.globalData.user);
             });
          }, config.stayTime);

        } else {
           throw new Error(res?.message || '登录失败');
        }
      } catch (err) {
        console.error('[LoginWall] Auth error:', err);
        this.setData({ 
          authButtonText: '再次尝试授权手机号',
          authState: 'fail'
        });
        setTimeout(() => this.setData({ authState: 'idle' }), 2000);
      }
    },

    retry() {
      const app = getApp<any>();
      this.setData({ internalPhase: 'splash' });
      app.refreshUser().then(() => this.startFlow()).catch(() => this.startFlow());
    },
    preventTouch() { return; }
  }
});

