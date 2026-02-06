// remote-jobs/miniprogram/typings/types/api.d.ts

/**
 * 会员方案定义
 */
export interface IMemberScheme {
  scheme_id: number;
  type: 'plan' | 'topup';
  level: number;
  name_chinese: string;
  name_english: string;
  price: number;
  points: number;
  days: number;
  description_chinese?: string;
  description_english?: string;
  features_chinese?: string[];
  features_english?: string[];
  features_is_dash?: boolean[];
}

/**
 * getMemberSchemes 接口返回结果
 */
export interface IGetMemberSchemesResult {
  schemes: IMemberScheme[];
  userScheme?: IMemberScheme;
}

/**
 * calculatePrice 接口返回结果
 */
export interface ICalculatePriceResult {
  originalPrice: number;
  finalPrice: number;
  isUpgrade: boolean;
  discountAmount: number;
}

/**
 * login 接口返回结果
 */
export interface ILoginResult {
  openid: string;
  user: any; // 可以后续细化用户类型
}
