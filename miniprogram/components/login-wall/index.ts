import { callApi } from '../../utils/request';
import { getPhoneNumberFromAuth } from '../../utils/phoneAuth';

import { StatusCode } from '../../utils/statusCodes';

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
           // 如果已经在跑淡出流程，由内部逻辑控制 _shouldShow 的关闭
           if (this.data._flowStarted) {
               console.log('[LoginWall] Animation in progress, observer will not close _shouldShow');
               return;
           }
           this.setData({ _shouldShow: false });
        }
      }
    }
  },

  observers: {
    'internalPhase': function(phase) {
      if (phase === 'hidden') {
        // [Custom TabBar] Layer is already there, no need to show
      } else {
        // [Custom TabBar] Layer management via z-index
      }
    }
  },

  lifetimes: {
    attached() {
      // 检查当前是否已登录，如果已登录（Splash非必需），则直接跳过动画
      // 这能避免 Tab 切换时（如果页面被重建）导致 Splash 重复出现
      const app = getApp<any>();
      const { user, bootStatus } = app.globalData;
      if (user && user.phoneNumber && bootStatus === 'success') {
          console.log('[LoginWall] User already logged in on attach, skipping splash.');
          this.setData({ 
              internalPhase: 'hidden', 
              _shouldShow: false,
              authState: 'success'
          });
          return;
      }

      // 强制启动流程，确保 Splash 动画至少展示一次
      this.startFlow();
    },
    detached() {
      // Cleanup
    }
  },

  data: {
    internalPhase: 'splash' as 'splash' | 'login' | 'hidden',
    bootStatus: 'loading',
    errorMsg: '',
    errorDesc: '',
    _flowStarted: false,
    _shouldShow: false, // 真正控制 DOM 显示的开关
    
    // Auth Animation States
    authState: 'idle' as 'idle' | 'loading' | 'success' | 'fail',
    authButtonText: '一键授权手机号登录'
  },

  methods: {
    _authMinTimerPromise: null as Promise<void> | null,

    async startFlow() {
      if (this.data._flowStarted) return;
      
      console.log('[LoginWall] startFlow');
      this.setData({ 
        _flowStarted: true,
        _shouldShow: true,
        internalPhase: 'splash'
      });

      const checkState = () => {
        const _app = getApp<any>();
        const { bootStatus } = _app.globalData;
        
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
          console.log('[LoginWall] SUCCESS state detected');
          
          setTimeout(() => {
            this.setData({ internalPhase: 'hidden' });
          }, 100);
          
          // 动画彻底结束后（1.5s），清理流程状态
          setTimeout(() => {
            this.setData({ _flowStarted: false, _shouldShow: false });
            this.triggerEvent('loginSuccess', _app.globalData.user);
          }, 1500);
        } 
        else if (bootStatus === 'no-network' || bootStatus === 'server-down' || bootStatus === 'error') {
          // ⚠️ Network/Server Error: Stay in splash phase and keep star centered
          this.setData({ internalPhase: 'splash' });
          console.log(`[LoginWall] ${bootStatus} detected. Retrying in 4s (animation cycle)...`);
          
          // Wait for one full animation cycle (4s) before retrying the request
          setTimeout(() => {
            // Only retry if we are still in a failure state
            const currentStatus = _app.globalData.bootStatus;
            if (currentStatus === 'no-network' || currentStatus === 'server-down' || currentStatus === 'error') {
              _app.refreshUser().then(() => {
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

      // 立即检查状态，不需要人为等待，因为我们有整体 10s 的淡出
      checkState();
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
        // 用户取消授权，不执行任何动画改变
        return;
      }

      // 1. 开始动画：元素淡出，星星移位
      this.setData({ authState: 'loading' });

      // 2. 启动最低 1.5 秒的定时器
      const minTimerPromise = new Promise(resolve => setTimeout(resolve, 1500));

      try {
        const openid = wx.getStorageSync('user_openid');
        
        // 3. 并行执行业务逻辑
        const apiCall = callApi('getPhoneNumber', { code: detail.code, openid });
        
        // 等待业务完成
        const res: any = await apiCall;
        
        // 等待最低计时器完成
        await minTimerPromise;

        if (res && res.success && res.data && res.data.token) {
          // 登录成功
          wx.setStorageSync('token', res.data.token);
          app.globalData.user = res.data.user;
          app.globalData.bootStatus = 'success';

          this.setData({ authState: 'success' });

          // 整个淡出过程
          setTimeout(() => {
             // 触发淡出状态
             this.setData({ internalPhase: 'hidden' });
             
             // 动画持续 1.5s 后彻底释放占位
             setTimeout(() => {
                this.setData({ _flowStarted: false, _shouldShow: false });
                this.triggerEvent('loginSuccess', app.globalData.user);
             }, 1500);
          }, 400); 
        } else {
           throw new Error(res?.message || '登录失败');
        }

      } catch (err: any) {
        console.error('[LoginWall] Auth error:', err);
        
        // 等待最低计时器完成（防止接口报错太快动画没走完）
        await minTimerPromise;

        // 1. 首先改变按钮文字 (此时内容仍处于淡出隐藏状态，用户看不见文字改变，从而实现“无感”和“不闪烁”)
        this.setData({ 
            authButtonText: '请重新授权手机号'
        });

        // 2. 略微延迟，确保上一步的数据驱动渲染已生效（虽然 setData 是原子的，但为了极致保险）
        // 然后触发 authState 回位，内容会淡入，星星会移回原位
        setTimeout(() => {
            this.setData({ authState: 'idle' });
        }, 150);
      }
    }
  }
});
