# 云函数（cloudfunctions）

本项目使用微信云开发云函数。

## 目录结构

每个云函数是 `cloudfunctions/<name>/` 目录：

- `cloudfunctions/initUser/`
  - `index.js`：首次进入小程序时初始化一条 users 记录
  - `package.json`

- `cloudfunctions/updateUserProfile/`
  - `index.js`：更新 users 里的 resume_profile/avatar/nickname/phone/isAuthed 等字段
  - `package.json`

- `cloudfunctions/updateUserLanguage/`
  - `index.js`：更新 users 里的 language 字段（Chinese/English）
  - `package.json`

- `cloudfunctions/getPhoneNumber/`
  - `index.js`：使用前端 getPhoneNumber 返回的 code 换取手机号
  - `package.json`

## 会员系统相关云函数

- `cloudfunctions/initMemberSchemes/`
  - `index.js`：初始化会员方案配置（首次部署时调用一次）
  - `package.json`

- `cloudfunctions/getMemberSchemes/`
  - `index.js`：获取所有会员方案列表
  - `package.json`

- `cloudfunctions/createOrder/`
  - `index.js`：创建订单
  - `package.json`

- `cloudfunctions/updateOrderStatus/`
  - `index.js`：更新订单状态（支付成功后调用）
  - `package.json`

- `cloudfunctions/activateMembership/`
  - `index.js`：激活会员（支付成功后调用）
  - `package.json`

- `cloudfunctions/checkMemberStatus/`
  - `index.js`：检查用户会员状态和配额（返回 membership 包裹对象）
  - `package.json`

- `cloudfunctions/useResumeQuota/`
  - `index.js`：统一的简历生成/微调配额扣减
  - `package.json`

- `cloudfunctions/useEmailQuota/`
  - `index.js`：统一的邮件投递/沟通配额扣减
  - `package.json`

## 数据库集合

### users 集合
存储用户的基础信息、会员权益与个人资料。

#### 核心字段
- `openid`: String (Document ID) - 用户唯一标识
- `membership`: Object - 会员权益包裹字段
  - `level`: Integer - 0:普通用户, 1:3天体验, 2:月度普通, 3:月度高级
  - `expire_at`: DateTime - 会员到期时间
  - `total_ai_usage`: Object - {used, limit} 总 AI 动作水位（300次硬上限）
  - `job_quota`: Object - {used, limit} 岗位槽位限额
  - `job_details`: Object - 记录每个岗位的微调/邮件沟通明细
- `resume_profile`: Object - 个人简历资料
  - `name`, `photo`, `wechat`, `email`, `phone`, `educations`, `workExperiences`, `certificates`, `aiMessage`
- `language`: String - 用户界面语言 (Chinese/English/...)
- `isAuthed`: Boolean - 是否已完成手机号授权
- `createdAt`, `updatedAt`: DateTime

### orders 集合
- `order_id`, `user_id`, `scheme_id`, `amount`, `status`, `pay_time`, `createdAt`, `updatedAt`

### member_schemes 集合
- `scheme_id`, `name`, `price`, `duration_days`, `max_jobs`, `max_resume_edits_per_job`, `max_email_communications_per_job` 等

## 会员方案权益对照

| 等级 | 会员名称 | 价格 | 岗位总数 | 岗位微调上限 | 后续沟通上限 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | 3天体验 | 9.9 | 3 | 3 | 0 |
| **2** | 月度普通 | 29.9 | 10 | 5 | 5 |
| **3** | 月度高级 | 89.9 | 不限* | 不限* | 不限* |
*\*高级会员共享 300 次 AI 动作总额度*

## 注意
- **已废弃** `member_level`, `total_resume_quota`, `total_email_quota`, `used_jobs_count`, `ai_resume_quota`, `email_quota` 等根部字段，请统一使用 `membership` 和 `resume_profile`。
- **已废弃** `useQuota` 云函数，由 `useResumeQuota` 和 `useEmailQuota` 替代。
