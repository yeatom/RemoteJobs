import { callApi } from '../../utils/request';
import { InternalPhase, AuthState, SuccessMode, TIMINGS } from './constants';
import { getCeremonyConfig, executeFadeOut } from './ceremonies';

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
    authButtonText: '一键授权手机号登录',
    successMode: '' as SuccessMode 
  },

  lifetimes: {
    attached() {
      const app = getApp<any>();
      const { user, bootStatus } = app.globalData;
      if (user?.phoneNumber && bootStatus === 'success') {
          this.setData({ 
              internalPhase: 'hidden', 
              _shouldShow: false,
              authState: 'success'
          });
          return;
      }
      this.startFlow();
    }
  },

  methods: {
    async startFlow() {
      if (this.data._flowStarted) return;
      
      const app = getApp<any>();
      const hasShownSplash = app.globalData._splashAnimated;

      // 核心修复：如果本 session 已经展示过开屏，则初始状态为隐藏且不占位
      // 只有在明确需要登录墙（checkState 发现未授权）时才会由 checkState 唤起
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
          this.setData({ internalPhase: 'login' });
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

        if (res?.success && res.data?.token) {
          wx.setStorageSync('token', res.data.token);
          
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

