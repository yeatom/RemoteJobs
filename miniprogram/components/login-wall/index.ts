import { callApi } from '../../utils/request';
import { getPhoneNumberFromAuth } from '../../utils/phoneAuth';
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

    async onGetPhoneNumber(e: any) {
      const { detail } = e;
      const app = getApp<any>();

      if (!detail.code) {
        console.log('[LoginWall] User cancelled phone auth');
        return;
      }

      wx.showLoading({ title: '安全登录中' });

      try {
        const openid = wx.getStorageSync('user_openid');
        
        // 1. 调用 getPhoneNumber 接口获取并绑定手机号
        // 这里的后端需要支持：如果是新用户则创建，并返回 token
        const res: any = await callApi('getPhoneNumber', { 
            code: detail.code,
            openid 
        });

        if (res && res.success) {
          // 如果后端已经返回了 token 和 user (通常为了流程丝滑会直接返回)
          if (res.data && res.data.token) {
              wx.setStorageSync('token', res.data.token);
              app.globalData.user = res.data.user;
          } else {
              // 如果后端没返回，则再尝试一次 loginByOpenid 静默登录
              const authRes: any = await callApi('loginByOpenid', { openid });
              if (authRes && authRes.success && authRes.data) {
                  wx.setStorageSync('token', authRes.data.token);
                  app.globalData.user = authRes.data.user;
              } else {
                  throw new Error('登录失败，请重试');
              }
          }
          
          wx.hideLoading();
          wx.showToast({ title: '登录成功', icon: 'success' });
          
          // 触发父页面刷新或状态更新
          this.triggerEvent('loginSuccess', app.globalData.user);
          
          // 重置组件状态并消失
          this.setData({ internalPhase: 'hidden' });
          
          // 全局刷新用户状态
          app.refreshUser().catch(() => {});
          
        } else {
          wx.hideLoading();
          wx.showToast({ 
            title: res.message || '获取手机号失败', 
            icon: 'none' 
          });
        }
      } catch (err: any) {
        wx.hideLoading();
        console.error('[LoginWall] Auth Error:', err);
        wx.showToast({ title: '系统繁忙，请稍后再试', icon: 'none' });
      }
    }
  }
});
