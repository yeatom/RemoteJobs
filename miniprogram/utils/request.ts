// miniprogram/utils/request.ts

const BASE_URL = 'http://127.0.0.1:3000/api';
const HOST_URL = 'http://127.0.0.1:3000';

export const formatFileUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/public')) return `${HOST_URL}${url}`;
  return url;
};

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  result?: T; // To maintain compatibility with cloud function response structure
}

export const request = <T = any>(options: wx.RequestOption): Promise<T> => {
  return new Promise((resolve, reject) => {
    // 获取本地存储的身份标识
    const openid = wx.getStorageSync('user_openid');
    const url = options.url.startsWith('http') ? options.url : `${BASE_URL}${options.url}`;

    wx.request({
      ...options,
      url,
      header: {
        'content-type': 'application/json',
        'x-openid': openid || '',
        ...options.header,
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          reject(res);
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

/**
 * Helper to call backend APIs that previously were cloud functions
 */
export const callApi = async <T = any>(name: string, data: any = {}): Promise<ApiResponse<T>> => {
  // Automatic login if openid is missing (and not already doing login)
  if (name !== 'login' && !wx.getStorageSync('user_openid')) {
    console.log(`[API] Triggering auto-login for ${name}...`);
    try {
      await performLogin();
    } catch (err) {
      console.error('[API] Auto login error:', err);
    }
  }

  return request<ApiResponse<T>>({
    url: `/${name}`,
    method: 'POST',
    data,
  });
};

let loginPromise: Promise<string> | null = null;

/**
 * Standard WeChat login flow to get real openid
 * Implements Singleton pattern to prevent concurrent logins
 */
export const performLogin = (): Promise<string> => {
  if (loginPromise) {
    return loginPromise;
  }

  loginPromise = new Promise((resolve, reject) => {
    // Check storage one last time inside the promise to be safe
    const existing = wx.getStorageSync('user_openid');
    if (existing) {
      loginPromise = null;
      return resolve(existing);
    }

    wx.login({
      success: async (res) => {
        if (res.code) {
          try {
            // Call our own backend to exchange code for openid
            const loginRes = await request<ApiResponse>({
              url: '/login',
              method: 'POST',
              data: { code: res.code }
            });

            const openid = loginRes?.result?.openid || (loginRes as any)?.openid;
            if (openid) {
              wx.setStorageSync('user_openid', openid);
              // Update app global data if possible
              const app = getApp<IAppOption>();
              if (app?.globalData) {
                app.globalData.user = loginRes?.result?.user || (loginRes as any)?.user;
              }
              resolve(openid);
            } else {
              reject(new Error('Login failed: no openid returned'));
            }
          } catch (err) {
            reject(err);
          } finally {
            loginPromise = null;
          }
        } else {
          loginPromise = null;
          reject(new Error('wx.login failed: ' + res.errMsg));
        }
      },
      fail: (err) => {
        loginPromise = null;
        reject(err);
      }
    });
  });

  return loginPromise;
};

export const testRequest = async () => {
  try {
    console.log('Testing backend request to /jobs...');
    const data = await request({
      url: '/jobs',
      method: 'GET'
    });
    console.log('Backend request success:', data);
    return data;
  } catch (err) {
    console.error('Backend request failed:', err);
    throw err;
  }
};
