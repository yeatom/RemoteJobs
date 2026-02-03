import { t, type AppLanguage } from '../../utils/i18n'

/**
 * 界面文案配置映射表
 * 
 * 使用对象结构定义 UI 变量与 i18n Key 的对应关系。
 * 支持 TSDoc 注释，在代码中引用 ui.xxx 时可直接查看功能描述。
 */
const UI_MAP = {
    // --- 导航与状态 ---
    /** 语言设置行标题 */
    languageEntry: 'me.languageEntry',
    /** 邀请码行标题 */
    inviteCodeEntry: 'me.inviteCodeEntry',
    /** 立即登录 */
    loginNow: 'me.loginNow',
    /** 查看并编辑个人资料 */
    viewEditProfile: 'me.viewEditProfile',
    /** 会员到期后缀 */
    expiresSuffix: 'me.expiresSuffix',
    
    // --- 会员与配额 ---
    /** 会员权益管理 */
    manageBenefits: 'me.manageBenefits',
    /** 立即解锁 */
    unlockNow: 'me.unlockNow',
    /** 岗位提炼配额标题 */
    jobQuota: 'me.jobQuota',
    /** 开启全部会员特权提示 */
    memberFullAccess: 'me.memberFullAccess',
    /** 解锁 AI 特权提示 */
    unlockAIFeatures: 'me.unlockAIFeatures',
    /** 普通用户标识 */
    regularUser: 'me.regularUser',
    /** VIP 标签 */
    vipTag: 'me.vipTag',
    /** 会员到期日期提示 */
    memberExpiredDate: 'me.memberExpiredDate',
    /** 额度点数 */
    points: 'me.points',
    /** 可用 */
    available: 'me.available',
    /** 会员中心 */
    memberCenter: 'me.memberCenter',
    /** 生效中 */
    active: 'me.active',
    /** 未激活 */
    inactive: 'me.inactive',
    /** 充值与升级 */
    rechargeUpgrade: 'me.rechargeUpgrade',
    /** 立即支付 */
    payNow: 'me.payNow',
    /** 无限制标识 */
    unlimited: 'me.unlimited',
    /** AI 提炼额度展示标题 */
    aiQuotaTitle: 'me.aiQuotaTitle',
    /** 无限制使用文案 */
    unlimitedUse: 'me.unlimitedUse',
    /** 已用额度文案 */
    quotaUsed: 'me.quotaUsed',
    /** 总额度文案 */
    totalQuota: 'me.totalQuota',
    /** 补差价升级按钮文案 */
    upgradeAmountText: 'me.upgradeAmountText',
    /** 额度单位 */
    unitPoints: 'me.unitPoints',
    /** 天单位 (复数/常用) */
    unitDays: 'me.unitDays',
    /** 天单位 (单数) */
    unitDaysSingle: 'me.unitDaysSingle',
    /** 永久有效 */
    forever: 'me.forever',
    /** 合计标签 */
    totalLabel: 'me.totalLabel',
    /** 会员详情: AI分析 */
    noteFullAI: 'me.noteFullAI',
    /** 会员详情: 简历优化 */
    noteResumeOptim: 'me.noteResumeOptim',
    /** 会员详情: 双语 */
    noteMultiLang: 'me.noteMultiLang',
    /** 算力包: 叠加 */
    noteStackable: 'me.noteStackable',
    /** 算力包: 永久 */
    noteNoExpiry: 'me.noteNoExpiry',

    // --- 核心功能入口 ---
    /** 简历资料入口标题 */
    resumeProfileEntry: 'me.resumeProfileEntry',
    /** 简历资料入口描述 */
    resumeProfileSubtitle: 'me.resumeProfileSubtitle',
    /** 已生成简历入口标题 */
    generatedResumesEntry: 'me.generatedResumesEntry',
    /** 已生成简历入口描述 */
    generatedResumesSubtitle: 'me.generatedResumesSubtitle',

    // --- 个人资料编辑 ---
    /** 用户资料弹窗标题 */
    userProfileTitle: 'me.userProfileTitle',
    /** 上传头像 */
    uploadAvatar: 'me.uploadAvatar',
    /** 修改用户名标题 */
    editNickname: 'me.editNickname',
    /** 手机号标题 */
    phoneNumber: 'me.phoneNumber',
    /** 更换按钮 */
    changePhone: 'me.changePhone',
    /** 设置按钮 */
    setPhone: 'me.setPhone',
    /** 未设置/未开通 状态 */
    notSet: 'me.notSet',
    /** 未开通会员状态 */
    notActivated: 'me.notActivated',
    /** 未绑定手机号状态 */
    notBound: 'me.notBound',

    // --- 语言切换 ---
    /** 基础模式分组 */
    basicMode: 'me.basicMode',
    /** AI 增强模式分组 */
    aiMode: 'me.aiMode',
    /** 中文标准版标题 */
    langChinese: 'me.langChinese',
    /** 中文标准版描述 */
    langChineseDesc: 'me.langChineseDesc',
    /** 英文版标题 */
    langEnglish: 'me.langEnglish',
    /** 英文版描述 */
    langEnglishDesc: 'me.langEnglishDesc',
    /** AI 中文版标题 */
    langAIChinese: 'me.langAIChinese',
    /** AI 中文版描述 */
    langAIChineseDesc: 'me.langAIChineseDesc',
    /** AI 英文版标题 */
    langAIEnglish: 'me.langAIEnglish',
    /** AI 英文版描述 */
    langAIEnglishDesc: 'me.langAIEnglishDesc',

    // --- 邀请系统 ---
    /** 我的邀请码标题 */
    myInviteCode: 'me.myInviteCode',
    /** 复制按钮 */
    copy: 'me.copy',
    /** 应用按钮 */
    apply: 'me.apply',
    /** 邀请码已复制 */
    inviteCodeCopied: 'me.inviteCodeCopied',
    /** 邀请码已应用 */
    inviteCodeApplied: 'me.inviteCodeApplied',
    /** 邀请码格式错误词 */
    inviteCodeInvalid: 'me.inviteCodeInvalid',
    /** 邀请码输入位占位符 */
    inputInviteCodePlaceholder: 'me.inputInviteCodePlaceholder',
    /** 分享描述文案 */
    shareDesc: 'me.shareDesc',
    inviteFriendPlan: 'me.inviteFriendPlan',
    inviteRewardDesc: 'me.inviteRewardDesc',
    iHaveInviteCode: 'me.iHaveInviteCode',
    clickToCopy: 'me.clickToCopy',
    redeem: 'me.redeem',

    // --- 联系作者 ---
    /** 联系作者行标题 */
    contactAuthor: 'me.contactAuthor',
    /** 作者微信引导语 */
    authorWechatSlogan: 'me.authorWechatSlogan',
    /** 二维码长按提示 */
    qrHint: 'me.qrHint',

    // --- 会员权益详情 ---
    /** AI 翻译权益标题 */
    benefitTranslateTitle: 'me.benefitTranslateTitle',
    /** AI 翻译权益描述 */
    benefitTranslateSub: 'me.benefitTranslateSub',
    /** AI 简历权益标题 */
    benefitResumeTitle: 'me.benefitResumeTitle',
    /** AI 简历权益描述 */
    benefitResumeSub: 'me.benefitResumeSub',

    // --- 系统操作反馈 ---
    /** 加载中 */
    loading: 'me.loading',
    /** 上传中 */
    uploading: 'me.uploading',
    /** 上传成功 */
    uploadSuccess: 'me.uploadSuccess',
    /** 上传失败 */
    uploadFailed: 'me.uploadFailed',
    /** 保存中 */
    saving: 'me.saving',
    /** 重置密码/更新成功 */
    settingsUpdated: 'me.settingsUpdated',
    /** 更新失败反馈 */
    updateFailed: 'me.updateFailed',
    /** 用户名为空提示 */
    nicknameEmpty: 'me.nicknameEmpty',
    /** 用户名过长提示 */
    nicknameTooLong: 'me.nicknameTooLong',
    /** 用户名更新成功 */
    nicknameSuccess: 'me.nicknameSuccess',
    /** 手机号设置成功 */
    phoneUpdateSuccess: 'me.phoneUpdateSuccess',
    /** 手机号设置失败 */
    phoneUpdateFailed: 'me.phoneUpdateFailed',
    /** 手机号授权失败 */
    phoneAuthFailed: 'me.phoneAuthFailed',
    /** 获取手机号授权取消 */
    authCancel: 'me.authCancel',
    /** 登录成功 */
    loginSuccess: 'me.loginSuccess',

    // --- 支付与升级操作 ---
    /** 支付提示标题 */
    payPrompt: 'me.payPrompt',
    /** 支付中环境异常提示 */
    payError: 'me.payError',
    /** 支付已取消反馈 */
    payCancelled: 'me.payCancelled',
    /** 支付成功反馈 */
    paySuccess: 'me.paySuccess',
    /** 正在创建订单提示 */
    creatingOrder: 'me.creatingOrder',
    /** 正在激活会员提示 */
    activatingMember: 'me.activatingMember',
    /** 立即续费按钮 */
    renewNow: 'me.renewNow',
    /** 会员续费弹窗标题 */
    memberRenew: 'me.memberRenew',
    /** 升级普通会员标题 */
    upgradeBasicTitle: 'me.upgradeBasicTitle',
    /** 升级高级会员标题 */
    upgradeProTitle: 'me.upgradeProTitle',
    /** 补价升级引导 (动态逻辑由 buildPageUI 处理) */
    upgradeGuide: 'me.upgradeGuide',
    /** 续费确认文案 (含占位符) */
    memberRenewContent: 'me.memberRenewContent',
    /** 普通会员升级文案 (含占位符) */
    upgradeBasicContent: 'me.upgradeBasicContent',
    /** 高级会员升级文案 (含占位符) */
    upgradeProContent: 'me.upgradeProContent',

    // --- 手机号强绑定校验 ---
    /** 手机号安全提醒标题 */
    phoneWarningTitle: 'me.phoneWarningTitle',
    /** 手机号安全提醒内容 */
    phoneWarningContent: 'me.phoneWarningContent',
    /** 手机号安全提醒确认按钮 */
    phoneWarningConfirm: 'me.phoneWarningConfirm',
    /** 支付前绑定手机号提示 */
    paymentPhoneRequired: 'me.paymentPhoneRequired',

    // --- 跨模块功能性文案 ---
    /** 统一确认/完成按钮 */
    confirm: 'jobs.doneLabel',
    /** 统一保存按钮 */
    save: 'resume.save',
    /** 统一取消按钮 */
    cancel: 'resume.cancel',
    /** 统一支付跳转 */
    toPay: 'me.toPay',
    /** AI 解锁弹窗标题 */
    aiUnlockTitle: 'me.aiUnlockTitle',
    /** AI 解锁弹窗内容 */
    aiUnlockContent: 'me.aiUnlockContent',
} as const

/**
 * 构造页面所需的完整 UI 对象
 * @param lang 当前语言环境
 * @param data 页面当前的 Data，用于填充动态占位符（如金额、徽章名等）
 */
export function buildPageUI(lang: AppLanguage, data: any) {
    const ui: Record<string, string> = {}

    // 1. 自动执行全量静态 Key 映射
    Object.keys(UI_MAP).forEach((key) => {
        const i18nPath = UI_MAP[key as keyof typeof UI_MAP]
        ui[key] = t(i18nPath as any, lang)
    })

    // 2. 特殊动态逻辑处理：补差价升级引导
    const rawUpgradeGuide = t('me.upgradeGuide', lang) as string
    const displayAmount = typeof data.upgradeAmount === 'number' ? (data.upgradeAmount / 100).toFixed(1) : '0'
    ui.upgradeGuide = rawUpgradeGuide.replace('{amount}', displayAmount)

    // 3. 特殊动态逻辑处理：会员续费文案
    if (data.memberBadgeText) {
        const rawRenewContent = t('me.memberRenewContent', lang) as string
        ui.memberRenewContent = rawRenewContent.replace('{badge}', data.memberBadgeText)
    }

    return ui
}
