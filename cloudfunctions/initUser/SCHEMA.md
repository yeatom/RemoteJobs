# User Document Schema (数据库用户文档结构)

该文档描述了 `users` 集合中用户文档的字段结构。

## 基础字段 (Basic Fields)
- `openid`: `String` - 用户的唯一标识 (WeChat OpenID)。
- `isAuthed`: `Boolean` - 是否已完成实名/手机号认证。
- `phone`: `String | null` - 账号绑定的主手机号（用于登录/认证）。
- `nickname`: `String` - 用户昵称（默认为随机生成的“用户xxxxxx”）。
- `avatar`: `String` - 用户头像 URL 或 Cloud ID。
- `language`: `String` - 用户选择的界面语言 (e.g., 'Chinese', 'English', 'AIChinese')。
- `inviteCode`: `String` - 用户的个人邀请码。
- `createdAt`: `Date` - 账户创建时间。
- `updatedAt`: `Date` - 最后一次更新时间。

## 会员与配额 (Membership & Quota)
- `membership`: `Object` - 会员权益包裹字段。
  - `level`: `Number` - 会员等级 (0:普通, 1:3天体验, 2:普通月卡, 3:高级月卡)。
  - `expire_at`: `Date | null` - 会员到期时间。
  - `total_ai_usage`: `Object` - AI 总使用量监控。
    - `used`: `Number` - 已使用次数。
    - `limit`: `Number` - 总次数上限。
  - `job_quota`: `Object` - 岗位投递配额。
    - `used`: `Number` - 已投递数量。
    - `limit`: `Number` - 总投递上限。
  - `job_details`: `Object` - 记录每个岗位的交互详情 (e.g., 针对特定 job_id 的微调次数)。

## 简历资料 (Resume Profile)
- `resume_profile`: `Object` - 用户的简历信息（与账号信息独立）。
  - `name`: `String` - 真实姓名。
  - `photo`: `String` - 简历照片 Cloud ID。
  - `gender`: `String` - 性别。
  - `birthday`: `String` - 出生年月 (YYYY-MM)。
  - `identity`: `String` - 身份 (e.g., '在校生', '职场人')。
  - `wechat`: `String` - 简历联系微信。
  - `email`: `String` - 简历联系邮箱。
  - `phone`: `String` - 简历联系电话（独立于账号绑定的主手机号）。
  - `educations`: `Array<Object>` - 教育经历。
    - `school`: `String` - 学校名称。
    - `degree`: `String` - 学历 (e.g., '本科 (全日制)')。
    - `major`: `String` - 专业名称。
    - `startDate`: `String` - 开始日期 (YYYY-MM)。
    - `endDate`: `String` - 结束日期 (YYYY-MM 或 "至今")。
    - `description`: `String` - 在校描述/荣誉奖励 (选填)。
  - `workExperiences`: `Array<Object>` - 工作经历。
    - `company`: `String` - 公司名称。
    - `jobTitle`: `String` - 职位名称。
    - `businessDirection`: `String` - 业务方向（一句话描述）。
    - `startDate`: `String` - 开始日期 (YYYY-MM)。
    - `endDate`: `String` - 结束日期 (YYYY-MM 或 "至今")。
  - `certificates`: `Array<String>` - 证书列表。
  - `aiMessage`: `String` - 想对 AI 说的话。默认值："当工作经验不足时，自动补充工作经历；当过往职位名称与目标岗位不匹配时，根据公司业务方向，灵活变更过往职位名称与工作内容。"

## 系统状态 (System Status)
- `resume_completeness`: `Number` - 简历完整度等级。
  - `0`: 不完整。未满足以下全部条件：
    1. 基本信息完整（姓名、照片、性别、生日、身份）。
    2. 联系方式至少填一项（微信、邮箱、手机三选一）。
    3. 至少有一条教育经历。
  - `1`: 基本完整。已满足上述条件，可正常使用 AI 生成功能。
  - `2`: 非常完美。在等级 `1` 的基础上，至少填写了一个证书。
