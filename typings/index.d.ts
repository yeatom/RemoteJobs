/// <reference path="./types/index.d.ts" />

type AppUser = {
  openid?: string
  isAuthed?: boolean
  phone?: string | null
  nickname?: string | null
  avatar?: string | null
  member_level?: number // 0:普通用户, 1:3天会员, 2:普通月卡, 3:高级月卡
  member_expire_at?: Date | string | null
  // 新的配额字段
  total_resume_quota?: number // 总简历配额（-1表示按岗位数限制，高级会员使用）
  total_email_quota?: number // 总邮件配额（-1表示按岗位数限制，高级会员使用）
  email_quota_reset_at?: Date | string | null // 邮件配额重置时间（高级会员每月重置）
  used_jobs_count?: number // 已使用的岗位数（3天和普通会员使用）
  // 保留旧字段以兼容（已废弃）
  ai_resume_quota?: number
  email_quota?: number
}

type MemberScheme = {
  scheme_id: number
  name: string
  name_english?: string
  displayName?: string // 根据语言返回的显示名称
  price: number
  duration_days: number
  // 新的方案字段
  max_jobs?: number // 最大岗位数（-1表示不限制）
  max_resume_edits_per_job?: number // 每个岗位最大微调次数（-1表示不限制）
  total_resume_limit?: number // 总简历限制（-1表示按岗位数限制，300表示高级会员总额度）
  max_email_sends_per_job?: number // 每个岗位最大投递次数（-1表示不限制）
  max_email_communications_per_job?: number // 每个岗位最大沟通次数（0表示无沟通权，-1表示不限制）
  total_email_limit?: number // 总邮件限制（-1表示按岗位数限制，300表示高级会员总额度）
  // 保留旧字段以兼容（已废弃）
  ai_limit?: number
  email_limit?: number
  _id?: string
  createdAt?: Date | string
  updatedAt?: Date | string
}

type UserJobUsage = {
  _id?: string
  user_id: string
  job_id: string
  job_title?: string
  resume_edits_count?: number
  last_resume_edit_at?: Date | string | null
  email_sends_count?: number
  email_communications_count?: number
  last_email_at?: Date | string | null
  createdAt?: Date | string
  updatedAt?: Date | string
}

type Order = {
  order_id: string
  user_id: string
  scheme_id: number
  amount: number
  status: '待支付' | '已支付' | '已退款' | '已关闭'
  pay_time?: Date | string | null
  _id?: string
  createdAt?: Date | string
  updatedAt?: Date | string
}

interface IAppOption {
  globalData: {
    user: AppUser | null,
  }
  refreshUser: () => Promise<any>,
}
