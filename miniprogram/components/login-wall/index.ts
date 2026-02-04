import { callApi } from '../../utils/request';

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
      observer(newVal) {
        if (newVal) {
          wx.hideTabBar({ animated: true }).catch(() => {});
          this.startFlow();
        } else {
          this.setData({ internalPhase: 'hidden' });
          wx.showTabBar({ animated: true }).catch(() => {});
        }
      }
    }
  },

  lifetimes: {
    attached() {
      if (this.data.visible) {
        wx.hideTabBar().catch(() => {});
        this.startFlow();
      }
    }
  },

  data: {
    internalPhase: 'hidden', // 'splash' | 'login' | 'error' | 'hidden'
    type: 'login', // 'login' | 'register'
    phone: '',
    password: '',
    errorMsg: '',
    errorDesc: '请检查您的网络设置后重试'
  },

  methods: {
    async startFlow() {
      const app = getApp<any>();
      
      // 1. Initial State: Splash ACTIVE
      this.setData({ internalPhase: 'splash' });
      
      // 我们需要根据 app 的初始化状态来决定下一步
      const checkState = () => {
        const { bootStatus } = app.globalData;
        
        if (bootStatus === 'loading') {
          setTimeout(checkState, 300);
          return;
        }

        // 核心：处理网络恢复的自动平滑跳转
        if (bootStatus === 'success') {
          this.setData({ internalPhase: 'hidden' });
          this.triggerEvent('loginSuccess', app.globalData.user);
        } else if (bootStatus === 'no-network' || bootStatus === 'error' || bootStatus === 'server-down') {
          // 如果当前不在 error 态，或者错误信息变了，更新 UI
          let msg = '身份检查失败';
          let desc = '请确保您的网络环境正常';
          
          if (bootStatus === 'no-network') {
            msg = '网络连接已断开';
            desc = '请检查您的网络设置后重试';
          }
          if (bootStatus === 'server-down') {
            msg = '服务器连接失败';
            desc = '技术人员正在抢修中，请稍后再试';
          }

          if (this.data.internalPhase !== 'error' || this.data.errorMsg !== msg) {
            this.setData({ 
              internalPhase: 'error',
              errorMsg: msg,
              errorDesc: desc
            });
          }
          // 即使在错误态，也要继续轮询是否有网络恢复（由 App.ts 触发 loading）
          setTimeout(checkState, 2000); 
        } else if (bootStatus === 'unauthorized') {
          this.setData({ internalPhase: 'login' });
        }
      };

      // 设定一个保底展示时间，防止动画太短太突兀
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
        const endpoint = type === 'login' ? 'auth/login' : 'auth/register';
        const res = await callApi(endpoint, {
          phoneNumber: phone,
          password,
          openid
        });

        if (res && res.success && res.data) {
          wx.setStorageSync('token', res.data.token);
          app.globalData.user = res.data.user;
          
          wx.hideLoading();
          wx.showToast({ title: '登录成功', icon: 'success' });
          
          // 触发父页面刷新或状态更新
          this.triggerEvent('loginSuccess', res.data.user);
          
          // 重置组件状态
          this.setData({ visible: false, phone: '', password: '' });
          
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
        wx.showToast({ title: err.message || '网络繁忙', icon: 'none' });
      }
    }
  }
});
