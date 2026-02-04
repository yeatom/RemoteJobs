import { callApi } from '../../utils/request';
const lottie = require('../../utils/lottie');

import { StatusCode } from '../../utils/statusCodes';

Component({
  properties: {
    visible: {
      type: Boolean,
      value: true, 
      observer(newVal) {
        console.log('[LoginWall] Visible property changed:', newVal);
        if (newVal) {
          wx.hideTabBar({ animated: false } as any).catch(() => {});
          this.startFlow();
        } else {
           const app = getApp<any>();
           // Security check: only allow hiding if bootStatus is success
           if (app.globalData.bootStatus !== 'success') {
               console.error('[LoginWall] BYPASS REJECTED. bootStatus is:', app.globalData.bootStatus);
               this.setData({ visible: true });
               return;
           }
          this.setData({ internalPhase: 'hidden', _flowStarted: false });
          wx.showTabBar({ animated: true } as any).catch(() => {});
        }
      }
    }
  },

  lifetimes: {
    attached() {
      // 只要组件挂载，第一件事就是隐藏 TabBar，防止闪烁
      wx.hideTabBar({ animated: false } as any).catch(() => {});
      
      // Removed initLottie() since we switched to SVG for better reliability and fidelity

      if (this.data.visible) {
        this.startFlow();
      }
    },
    detached() {
      // Cleanup
    }
  },

  data: {
    internalPhase: 'splash', // 'splash' | 'login' | 'hidden'
    bootStatus: 'loading',
    type: 'login', 
    phone: '',
    password: '',
    errorMsg: '',
    errorDesc: '',
    _flowStarted: false
  },

  methods: {
    _lottieAni: null as any,

    async startFlow() {
      if (this.data._flowStarted) return;
      this.setData({ _flowStarted: true });

      const app = getApp<any>();
      console.log('[LoginWall] Flow started. Current bootStatus:', app.globalData.bootStatus);
      
      // Start in Splash Mode
      this.setData({ internalPhase: 'splash' });
      
      const checkState = () => {
        const { bootStatus } = app.globalData;
        
        if (this.data.bootStatus !== bootStatus) {
            this.setData({ bootStatus });
        }

        // If loading, keep checking
        if (bootStatus === 'loading') {
          setTimeout(checkState, 300);
          return;
        }

        console.log('[LoginWall] Finalizing state. Status:', bootStatus);

        if (bootStatus === 'success') {
          // Success: Fade out splash background -> Reveal App
          setTimeout(() => {
             this.setData({ internalPhase: 'hidden', _flowStarted: false });
             this.triggerEvent('loginSuccess', app.globalData.user);
          }, 600);
        } 
        else if (bootStatus === 'no-network' || bootStatus === 'server-down' || bootStatus === 'error') {
          // ⚠️ Network/Server Error: Stay in splash phase and keep star centered
          this.setData({ internalPhase: 'splash' });
          console.log(`[LoginWall] ${bootStatus} detected. Retrying in 4s (animation cycle)...`);
          
          // Wait for one full animation cycle (4s) before retrying the request
          setTimeout(() => {
            // Only retry if we are still in a failure state
            const currentStatus = getApp<any>().globalData.bootStatus;
            if (currentStatus === 'no-network' || currentStatus === 'server-down' || currentStatus === 'error') {
              app.refreshUser().then(() => {
                checkState();
              }).catch(() => {
                checkState();
              });
            } else {
              checkState();
            }
          }, 4000);
        }
        else {
          // Unauthorized or New User: Star flies to Login Card
          this.setData({ internalPhase: 'login' });
        }
      };

      // Ensure splash shows for at least 1.5s to appreciate the globe animation
      setTimeout(checkState, 1500);
    },

    retry() {
      const app = getApp<any>();
      this.setData({ internalPhase: 'splash' });
      app.refreshUser().then(() => {
        this.startFlow();
      }).catch(() => {
        this.startFlow();
      });
    },
    preventTouch() {
      // 阻止触摸穿透
      return;
    },

    switchType(e: any) {
      const type = e.currentTarget.dataset.type;
      if (this.data.type === type) return;
      this.setData({ type });
    },

    async handleSubmit() {
      const { type, phone, password } = this.data;
      const app = getApp<IAppOption>();

      if (!phone || !password) {
        wx.showToast({ title: '请填写完整', icon: 'none' });
        return;
      }

      const openid = wx.getStorageSync('user_openid');

      wx.showLoading({ title: '提交中' });

      try {
        const endpoint = type === 'login' ? 'loginByPhone' : 'register';
        const res = await callApi(endpoint, {
          phoneNumber: phone,
          password,
          openid
        });

        if (res && res.success && res.data) {
          wx.setStorageSync('token', res.data.token);
          app.globalData.user = res.data.user;
          
          wx.hideLoading();
          wx.showToast({ title: type === 'login' ? '登录成功' : '注册成功', icon: 'success' });
          
          // 触发父页面刷新或状态更新
          this.triggerEvent('loginSuccess', res.data.user);
          
          // 重置组件状态
          this.setData({ internalPhase: 'hidden', phone: '', password: '' });
          
          // 全局刷新用户状态
          app.refreshUser().catch(() => {});
          
        } else {
          wx.hideLoading();
          wx.showToast({ 
            title: res.message || '操作失败', 
            icon: 'none' 
          });
        }
      } catch (err: any) {
        wx.hideLoading();
        console.error('[LoginWall] Submit Error:', err);
        
        let msg = '服务器繁忙';
        const resData = err.data;
        
        if (resData && resData.code === StatusCode.USER_EXISTS) {
            msg = '该手机号已注册';
        } else if (resData && (resData.code === StatusCode.UNAUTHORIZED || resData.code === StatusCode.INVALID_TOKEN)) {
            msg = '账号或密码错误';
        }

        wx.showToast({ title: msg, icon: 'none' });
      }
    }
  }
});
