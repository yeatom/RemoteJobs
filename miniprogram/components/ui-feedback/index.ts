Component({
  properties: {
    title: { 
      type: String, 
      value: ''
    },
    type: { type: String, value: 'loading' }, // 'loading', 'success', 'error', 'none'
    mask: { type: Boolean, value: false },
    visible: { 
      type: Boolean, 
      value: false,
      observer(newVal) {
        const self = this as any;
        if (newVal) {
          if (self._hideTimer) {
            clearTimeout(self._hideTimer);
            self._hideTimer = null;
          }
          this.setData({ 
            innerVisible: true,
            displayVisible: true
          });
        } else {
          // 延迟开始隐藏动画，防止在 loading -> success 切换时的瞬时闪烁
          self._hideTimer = setTimeout(() => {
            this.setData({ displayVisible: false });
            // 给消失动画留出时间
            setTimeout(() => {
              if (!this.data.visible) {
                this.setData({ innerVisible: false });
              }
            }, 300);
            self._hideTimer = null;
          }, 50);
        }
      }
    }
  },
  data: {
    innerVisible: false,
    displayVisible: false
  },
  methods: {
  }
})
