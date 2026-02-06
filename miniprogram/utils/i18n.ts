export type AppLanguage = 'Chinese' | 'English' | 'AIChinese' | 'AIEnglish'

// One source of truth for supported languages
export const SUPPORTED_LANGUAGES: AppLanguage[] = ['Chinese', 'English', 'AIChinese', 'AIEnglish']

// Simple key-based dictionary for UI text.
// NOTE: Job content is excluded by design.
const dict = {
    tab: {
        jobs: { Chinese: '岗位', English: 'Jobs' },
        resume: { Chinese: '简历', English: 'Resume' },
        positions: { Chinese: '职位', English: 'Positions' },
        me: { Chinese: '我', English: 'Me' },
    },
    me: {
        title: { Chinese: '我', English: 'Me' },
        appShareTitle: { Chinese: '丈月尺 - 远程办公岗位', English: 'WeChatJobs - Remote Positions' },
        favoritesEntry: { Chinese: '我收藏的岗位', English: 'Saved jobs' },
        languageEntry: { Chinese: '语言与内容显示', English: 'Language & Display' },
        langChinese: { Chinese: '中文 (标准)', English: 'Chinese (Standard)' },
        langChineseDesc: { Chinese: '界面中文，岗位内容保持原样', English: 'Chinese UI, original job content' },
        langEnglish: { Chinese: '英文', English: 'English' },
        langEnglishDesc: { Chinese: 'Interface in English, original job content', English: 'Interface in English, original job content' },
        langAIChinese: { Chinese: 'AI 智能全中文', English: 'AI Smart Chinese' },
        langAIChineseDesc: { Chinese: '全中阅读，AI 自动提取薪资/经验/技能标签', English: 'Full Chinese, AI extracts salary/exp/skills' },
        langAIEnglish: { Chinese: 'AI Smart English', English: 'AI Smart English' },
        langAIEnglishDesc: { Chinese: 'Full English, AI extracts salary/exp/skills', English: 'Full English, AI extracts salary/exp/skills' },
        comingSoon: { Chinese: '敬请期待', English: 'Coming soon' },
        loginSuccess: { Chinese: '登录成功', English: 'Logged in' },
        phoneAuthFailed: { Chinese: '手机号授权失败', English: 'Phone authorization failed' },
        phoneAuthRequired: { Chinese: '请先授权手机号', English: 'Please authorize your phone number' },
        openDetailFailed: { Chinese: '无法打开详情', English: 'Unable to open details' },
        loadFavoritesFailed: { Chinese: '加载收藏失败', English: 'Failed to load saved jobs' },
        emptyFavorites: { Chinese: '暂无收藏岗位', English: 'No saved jobs' },
        generateResumeEntry: { Chinese: '生成简历', English: 'Generate Resume' },
        language: { Chinese: '语言', English: 'Language' },
        inviteCodeEntry: { Chinese: '邀请码', English: 'Invite Code' },
        myInviteCode: { Chinese: '我的邀请码', English: 'My Invite Code' },
        inputInviteCode: { Chinese: '输入邀请码', English: 'Enter Invite Code' },
        inviteCodeCopied: { Chinese: '邀请码已复制', English: 'Invite code copied' },
        inviteCodeInvalid: { Chinese: '邀请码格式不正确', English: 'Invalid invite code format' },
        inviteCodeApplied: { Chinese: '邀请码已应用', English: 'Invite code applied successfully' },
        inviteFriendPlan: { Chinese: '邀请好友计划', English: 'Referral Program' },
        inviteRewardDesc: { Chinese: '双方获赠3天会员(非会员送体验/会员享延期) 和 5点算力', English: 'Both get 3 days (Trial or Extension) + 5 pts' },
        iHaveInviteCode: { Chinese: '我有邀请码', English: 'I have an invite code' },
        clickToCopy: { Chinese: '点击复制邀请码', English: 'Click to copy code' },
        redeem: { Chinese: '兑换', English: 'Redeem' },
        memberBadge: { Chinese: '丈月尺会员', English: 'Subscribed' },
        uploadAvatar: { Chinese: '上传头像', English: 'Upload Avatar' },
        editNickname: { Chinese: '用户名', English: 'Username' },
        memberExpiredDate: { Chinese: '会员到期日期', English: 'Expiration Date' },
        phoneNumber: { Chinese: '手机号', English: 'Phone' },
        changePhone: { Chinese: '更换', English: 'Change' },
        setPhone: { Chinese: '设置', English: 'Set' },
        phoneWarningTitle: { Chinese: '重要提示', English: 'Final Check' },
        phoneWarningContent: { Chinese: '手机号是您会员身份的唯一标识，设置后将无法自行更改。请务必慎重选择您常用的手机号。', English: 'This phone number is your unique member ID and cannot be changed once set. Please ensure it is your primary number.' },
        phoneWarningConfirm: { Chinese: '我确定', English: 'I am sure' },
        paymentPhoneRequired: { Chinese: '为了保障您的会员权益，请先绑定手机号。手机号是您会员身份的唯一标识。', English: 'Please set your phone number first to link your membership benefits. Your phone number is your unique member ID.' },
        nicknameTooLong: { Chinese: '用户名太长了', English: 'Nickname is too long' },
        resumeProfileEntry: { Chinese: '简历资料', English: 'Resume Profile' },
        generatedResumesEntry: { Chinese: '已生成简历', English: 'Generated Resumes' },
        loading: { Chinese: '加载中...', English: 'Loading...' },
        loginNow: { Chinese: '丈月尺用户', English: 'User' },
        viewEditProfile: { Chinese: '查看并编辑个人资料', English: 'View and edit profile' },
        regularUser: { Chinese: '普通用户', English: 'Regular User' },
        jobQuota: { Chinese: '简历生成额度', English: 'Resume Quota' },
        memberFullAccess: { Chinese: '您已开启全部会员特权', English: 'All member privileges unlocked' },
        unlockAIFeatures: { Chinese: '解锁 AI 自动翻译与岗位要求提炼', English: 'Unlock AI translation & job intel' },
        upgradeGuide: { Chinese: '额度已满？补差价 ¥{amount} 升级月卡 ❯', English: 'Quota full? Pay ¥{amount} to upgrade ❯' },
        manageBenefits: { Chinese: '管理权益', English: 'Manage' },
        unlockNow: { Chinese: '立即解锁', English: 'Unlock' },
        resumeProfileSubtitle: { Chinese: '完善信息，提升 AI 匹配度', English: 'Complete info for better AI matching' },
        retry: { Chinese: '重试', English: 'Retry' },
        generatedResumesSubtitle: { Chinese: '预览及下载 PDF 简历', English: 'Preview & download PDF resumes' },
        basicMode: { Chinese: '基础模式', English: 'Basic Mode' },
        aiMode: { Chinese: 'AI 增强模式', English: 'AI Enhanced Mode' },
        vipTag: { Chinese: 'VIP', English: 'VIP' },
        inputInviteCodePlaceholder: { Chinese: '请输入邀请码', English: 'Enter invite code' },
        copy: { Chinese: '复制', English: 'Copy' },
        apply: { Chinese: '应用', English: 'Apply' },
        contactAuthor: { Chinese: '联系作者', English: 'Contact Author' },
        contactAuthorDesc: { Chinese: '合作、反馈或活动报名', English: 'Collab, feedback or events' },
        authorWechatSlogan: { Chinese: '活动报名成功后请务必添加作者微信，发布岗位及商务合作请备注原因。', English: 'Please add author on WeChat after activity signup. Job posts and business collabs require a note.' },
        wechatIdCopied: { Chinese: '微信号已复制，请去微信添加', English: 'WeChat ID copied, please add in App' },
        shareDesc: { Chinese: '每成功邀请一位好友，双方各获得3天高级会员', English: 'Refer a friend, both get 3 days Premium' },
        expiresSuffix: { Chinese: '到期', English: 'Expires' },
        points: { Chinese: '可用额度', English: 'Points' },
        available: { Chinese: '可用额度', English: 'Available Points' },
        memberCenter: { Chinese: '会员中心', English: 'Member Center' },
        active: { Chinese: '生效中', English: 'Active' },
        inactive: { Chinese: '未激活', English: 'Inactive' },
        rechargeUpgrade: { Chinese: '充值与升级', English: 'Recharge & Upgrade' },
        payNow: { Chinese: '立即支付', English: 'Pay Now' },
        aiQuotaTitle: { Chinese: 'AI 简历生成额度', English: 'AI Resume Quota' },
        unlimitedUse: { Chinese: '∞ 无限制使用', English: '∞ Unlimited' },
        unlimited: { Chinese: '无限制', English: 'UNLIMITED' },
        quotaUsed: { Chinese: '已用', English: 'Used' },
        totalQuota: { Chinese: '总额度', English: 'Total' },
        renewNow: { Chinese: '立即续费', English: 'Renew Now' },
        upgradeAmountText: { Chinese: '补差价 升级', English: 'Upgrade Now' },
        userProfileTitle: { Chinese: '用户资料', English: 'User Profile' },
        notSet: { Chinese: '未设置', English: 'Not Set' },
        benefitTranslateTitle: { Chinese: 'AI 岗位智能翻译', English: 'AI Job Translation' },
        benefitTranslateSub: { Chinese: '全中/英岗位描述，无障碍阅读', English: 'Full CN/EN descriptions' },
        benefitResumeTitle: { Chinese: 'AI 生成简历', English: 'AI Resume Builder' },
        benefitResumeSub: { Chinese: '针对不同岗位，智能生成高匹配度简历', English: 'High-match resumes for any job' },
        qrHint: { Chinese: '（长按识别二维码或保存图片）', English: '(Long press to scan or save image)' },
        aiUnlockTitle: { Chinese: 'AI翻译与提炼 🔒', English: 'AI translation & intel 🔒' },
        aiUnlockContent: { Chinese: '开启 AI 增强模式需要付费解锁。', English: 'Payment is required to unlock AI Enhanced Mode.' },
        toPay: { Chinese: '去支付', English: 'To Pay' },
        settingsUpdated: { Chinese: '设置已更新', English: 'Settings updated' },
        loadInviteCodeFailed: { Chinese: '加载邀请码失败', English: 'Failed to load invite code' },
        uploading: { Chinese: '上传中...', English: 'Uploading...' },
        uploadSuccess: { Chinese: '头像更新成功', English: 'Avatar updated' },
        uploadFailed: { Chinese: '上传失败', English: 'Upload failed' },
        nicknameEmpty: { Chinese: '用户名不能为空', English: 'Nickname cannot be empty' },
        saving: { Chinese: '保存中...', English: 'Saving...' },
        nicknameSuccess: { Chinese: '用户名更新成功', English: 'Nickname updated' },
        updateFailed: { Chinese: '更新失败', English: 'Update failed' },
        memberRenew: { Chinese: '会员续费', English: 'Renew Membership' },
        memberRenewContent: { Chinese: '即将为您办理 {badge} 的续费手续。', English: 'You are about to renew your {badge} subscription.' },
        upgradeBasicTitle: { Chinese: '升级普通会员', English: 'Upgrade to Basic' },
        upgradeBasicContent: { Chinese: '补差价 ¥{amount} 即可升级为普通会员，享受更多岗位配额及 AI 提炼次数。', English: 'Pay ¥{amount} more to upgrade to Basic for more quota.' },
        upgradeProTitle: { Chinese: '升级高级会员', English: 'Upgrade to Premium' },
        upgradeProContent: { Chinese: '补差价 ¥{amount} 即可升级为高级会员，尊享无限次 AI 提炼及专属视觉效果。', English: 'Pay ¥{amount} more to upgrade to Premium for unlimited AI intel.' },
        creatingOrder: { Chinese: '正在创建订单...', English: 'Creating order...' },
        activatingMember: { Chinese: '正在激活会员...', English: 'Activating membership...' },
        paySuccess: { Chinese: '支付成功', English: 'Payment successful' },
        payCancelled: { Chinese: '支付已取消', English: 'Payment cancelled' },
        payPrompt: { Chinese: '支付提示', English: 'Payment Prompt' },
        payError: { Chinese: '支付过程出现问题，请稍后再试', English: 'Payment failed, please try again later.' },
        notActivated: { Chinese: '未开通', English: 'Not Activated' },
        notBound: { Chinese: '未绑定', English: 'Not Bound' },
        phoneUpdateSuccess: { Chinese: '手机号设置成功', English: 'Phone number updated' },
        phoneUpdateFailed: { Chinese: '手机号设置失败', English: 'Failed to update phone number' },
        authCancel: { Chinese: '未获取到手机号授权', English: 'Phone authorization cancelled' },
        authRequiredTitle: { Chinese: '需要身份认证', English: 'Authentication required' },
        authRequiredContent: { Chinese: '为了您的简历和会员权益能够永久同步，请先登录并验证手机号。', English: 'To keep your resumes and membership linked, please log in and verify your phone number.' },
        authRequiredConfirm: { Chinese: '去登录', English: 'Log in' },
        publishSkillEntry: { Chinese: '发布技能', English: 'Publish Skill' },
        applyFailed: { Chinese: '应用失败', English: 'Apply failed' },
        orderCreateFailed: { Chinese: '订单创建失败', English: 'Order creation failed' },
        payParamMissing: { Chinese: '支付参数缺失，请检查云开发后台配置', English: 'Payment parameters missing, please check backend config' },
        activateMemberFailed: { Chinese: '激活会员失败', English: 'Activate membership failed' },
        mchIdMissing: { Chinese: '未能在 env.js 中找到商户号 mchId', English: 'mchId not found in env.js' },
        unitPoints: { Chinese: '额度', English: 'pts' },
        unitDays: { Chinese: '天', English: 'Days' },
        unitDaysSingle: { Chinese: '天', English: 'Day' },
        forever: { Chinese: '永久', English: 'Forever' },
        totalLabel: { Chinese: '合计:', English: 'Total:' },
        noteFullAI: { Chinese: '✓ 解锁全功能 AI 分析', English: '✓ Full AI Analysis' },
        noteResumeOptim: { Chinese: '✓ 简历针对性优化', English: '✓ Resume Optimization' },
        noteMultiLang: { Chinese: '✓ 中英双语支持', English: '✓ Multi-Language Support' },
        noteStackable: { Chinese: '✓ 支持多次叠加购买', English: '✓ Stackable purchase' },
        noteNoExpiry: { Chinese: '✓ 个人额度永久有效', English: '✓ Forever valid' },
        // Job checks
        checkingStatus: { Chinese: '检查状态...', English: 'Checking status...' },
        checkFailed: { Chinese: '系统检查失败', English: 'System check failed' },
        // Generated resumes / retry / file actions
        retrying: { Chinese: '已开始重试', English: 'Retrying...' },
        deleteResumeConfirm: { Chinese: '确定要删除这份简历吗？删除后无法恢复。', English: 'Are you sure you want to delete this resume?' },
        deleting: { Chinese: '删除中...', English: 'Deleting...' },
        deleteSuccess: { Chinese: '删除成功', English: 'Success' },
        deleteFailedShort: { Chinese: '删除失败', English: 'Failed' },
        errorShort: { Chinese: '错误', English: 'Error' },
        loadingFailed: { Chinese: '加载失败', English: 'Load failed' },
        fetchingFile: { Chinese: '正在获取文件...', English: 'Fetching file...' },
        recoveringExpiredFile: { Chinese: '过期文件恢复中...', English: 'Recovering expired file...' },
        cloudRerenderingToast: { Chinese: '文件已在云端重新渲染中，请稍候', English: 'File is being re-rendered in cloud, please wait' },
        oldFileUnavailable: { Chinese: '文件已过期且无法恢复', English: 'Old file unavailable' },
        cannotOpenDocument: { Chinese: '无法打开该文档', English: 'Unable to open the document' },
        downloadFailed: { Chinese: '下载失败', English: 'Download failed' },
        // Date / sync validations
        startAfterEnd: { Chinese: '开始时间不能晚于结束时间', English: 'Start date cannot be after end date' },
        endBeforeStart: { Chinese: '结束时间不能早于开始时间', English: 'End date cannot be before start date' },
        selectStartTime: { Chinese: '请选择开始时间', English: 'Please select start date' },
        selectEndTime: { Chinese: '请选择结束时间', English: 'Please select end date' },
    },
    resume: {
        toolTitle: { Chinese: '求职助手', English: 'Career Assistant' },
        toolSubtitle: { Chinese: '让 AI 帮你搞定简历与面试', English: 'AI Resume & Interview Assistant' },
        toolScreenshotTitle: { Chinese: '截图生成简历', English: 'Screenshot to Resume' },
        toolScreenshotDesc: { Chinese: '上传岗位截图，AI 自动生成匹配简历', English: 'Upload screenshot for AI match' },
        toolTextTitle: { Chinese: '文字生成简历', English: 'Text to Resume' },
        toolTextDesc: { Chinese: '粘贴文字，AI 自动生成匹配简历', English: 'Paste text for AI match' },
        toolRefineTitle: { Chinese: '简历润色', English: 'Resume Refinement' },
        toolRefineDesc: { Chinese: '上传旧简历，AI 帮你重写升级', English: 'Upload old resume for AI upgrade' },
        confirmGenerate: { Chinese: '生成', English: 'Generate' },
        jdPlaceholder: { Chinese: '请粘贴完整的职位描述（JD）...', English: 'Paste full job description (JD)...' },
        experience: { Chinese: '经验要求', English: 'Experience' },
        experiencePlaceholder: { Chinese: '例:1-3年 (填0则ai不会额外生成工作经历)', English: 'e.g. 1-3 years (fill 0 to disable AI-added experience)' },
        jobDescription: { Chinese: '岗位描述内容', English: 'Job Description' },
        title: { Chinese: '简历资料', English: 'Resume Profile' },
        tabCn: { Chinese: '中文版', English: 'Chinese' },
        tabEn: { Chinese: '英文版', English: 'English' },
        syncFromCn: { Chinese: '与中文版同步', English: 'Sync from CN' },
        syncConfirmTitle: { Chinese: '同步确认', English: 'Confirm' },
        syncConfirmContent: { Chinese: '确定要从中文简历同步吗？这会覆盖当前的英文简历内容。', English: 'Sync from Chinese resume? Current English content will be overwritten.' },
        synced: { Chinese: '同步成功', English: 'Synced' },
        universityPlaceholder: { Chinese: '选择或输入学校', English: 'Select or enter university' },
        whatsapp: { Chinese: 'WhatsApp', English: 'WhatsApp' },
        telegram: { Chinese: 'Telegram', English: 'Telegram' },
        linkedin: { Chinese: 'LinkedIn', English: 'LinkedIn' },
        tips: { Chinese: '完善以下信息，让 AI 更好地为您生成简历', English: 'Complete the info for better AI resume generation' },
        tipsComplete: { Chinese: '信息很完整，快去体验AI简历吧', English: 'Information is very complete, go experience AI Resume!' },
        tipsPerfect: { Chinese: '非常完美，快去体验AI简历吧', English: 'Very perfect, go experience AI Resume!' },
        personalInfo: { Chinese: '基本信息', English: 'Basic Info' },
        contactInfo: { Chinese: '联系方式', English: 'Contact' },
        name: { Chinese: '个人信息', English: 'Personal Profile' },
        realName: { Chinese: '姓名', English: 'Full Name' },
        nameEn: { Chinese: '英文名', English: 'English Name' },
        location: { Chinese: '所在地', English: 'Location' },
        phoneEn: { Chinese: '手机号 (国际)', English: 'Phone (Intl)' },
        personalWebsite: { Chinese: '个人网站', English: 'Personal Website' },
        gender: { Chinese: '性别', English: 'Gender' },
        birthday: { Chinese: '出生年月', English: 'Birthday' },
        identity: { Chinese: '身份', English: 'Identity' },
        photo: { Chinese: '照片', English: 'Photo' },
        wechat: { Chinese: '微信号', English: 'WeChat' },
        email: { Chinese: '邮箱', English: 'Email' },
        phone: { Chinese: '手机号', English: 'Phone' },
        education: { Chinese: '毕业院校', English: 'Education' },
        degree: { Chinese: '学历', English: 'Degree' },
        major: { Chinese: '专业', English: 'Major' },
        startDate: { Chinese: '开始日期', English: 'Start Date' },
        endDate: { Chinese: '结束日期', English: 'End Date' },
        schoolPlaceholder: { Chinese: '请输入学校名称', English: 'Enter school name' },
        majorPlaceholder: { Chinese: '请输入专业名称', English: 'Enter major name' },
        degreePlaceholder: { Chinese: '请选择学历', English: 'Select degree' },
        genderPlaceholder: { Chinese: '请选择性别', English: 'Select gender' },
        identityPlaceholder: { Chinese: '请选择身份', English: 'Select identity' },
        birthdayPlaceholder: { Chinese: '请选择出生年月', English: 'Select birthday' },
        namePlaceholder: { Chinese: '请输入姓名', English: 'English Name' },
        description: { Chinese: '在校描述', English: 'Description' },
        descriptionPlaceholder: { Chinese: '主要课程、荣誉奖励等', English: 'Main courses, honors, etc.' },
        optional: { Chinese: '选填', English: 'Optional' },
        certificates: { Chinese: '证书', English: 'Certificates' },
        graduationDate: { Chinese: '毕业时间', English: 'Graduation Date' },
        timePeriod: { Chinese: '时间段', English: 'Time Period' },
        workExperience: { Chinese: '工作经历', English: 'Work Experience' },
        skills: { Chinese: '专业技能', English: 'Skills' },
        addSkill: { Chinese: '添加技能', English: 'Add Skill' },
        skillPlaceholder: { Chinese: '请输入技能，如：TypeScript', English: 'e.g. TypeScript' },
        addCertificate: { Chinese: '添加证书', English: 'Add Certificate' },
        certificatesPlaceholder: { Chinese: '请输入证书，如：CET-6', English: 'e.g. CET-6' },
        company: { Chinese: '公司名称', English: 'Company' },
        companyPlaceholder: { Chinese: '可不填，用于生成简历名称', English: 'Optional, for resume naming' },
        jobTitle: { Chinese: '职位名称', English: 'Job Title' },
        jobTitlePlaceholder: { Chinese: '请输入职位名称', English: 'Enter job title' },
        businessDirection: { Chinese: '业务方向', English: 'Business Direction' },
        businessDirectionPlaceholder: { Chinese: '简要描述公司的业务方向，AI会做参考', English: 'Brief description of company business' },
        workContent: { Chinese: '工作内容', English: 'Work Content' },
        workContentPlaceholder: { Chinese: '简要描述主要工作内容，AI会做参考', English: 'Briefly describe responsibilities (Optional)' },
        addWorkExperience: { Chinese: '添加工作经历', English: 'Add Work Experience' },
        aiMessageLabel: { Chinese: '想对 AI 说的话', English: 'Message to AI' },
        aiMessageDefault: { Chinese: '当工作经验不足时，自动补充工作经历；当过往职位名称与目标岗位不匹配时，根据公司业务方向，灵活变更过往职位名称与工作内容。', English: 'Automatically supplement work experience when experience is insufficient; when past job titles do not match the target position, flexibly change past job titles and work contents based on the company\'s business direction.' },
        addEducation: { Chinese: '添加教育经历', English: 'Add Education' },
        noData: { Chinese: '暂无数据', English: 'No data' },
        edit: { Chinese: '编辑', English: 'Edit' },
        done: { Chinese: '完成', English: 'Done' },
        save: { Chinese: '保存', English: 'Save' },
        saveSuccess: { Chinese: '保存成功', English: 'Saved successfully' },
        saveFailed: { Chinese: '保存失败', English: 'Save failed' },
        cancel: { Chinese: '取消', English: 'Cancel' },
        delete: { Chinese: '删除', English: 'Delete' },
        toPresent: { Chinese: '至今', English: 'Present' },
        degreeOptions: {
            Chinese: ['大专', '本科', '硕士', '博士', '其他'],
            English: ['Associate', 'Bachelor', 'Master', 'PhD', 'Other']
        },
        studyTypes: {
            Chinese: ['全日制', '非全日制'],
            English: ['Full-time', 'Part-time']
        },
        genderOptions: {
            Chinese: ['男', '女', '保密'],
            English: ['Male', 'Female', 'Secret']
        },
        identityOptions: {
            Chinese: ['在校生', '职场人'],
            English: ['Student', 'Professional']
        },
        // Confirmation dialogs
        deleteWorkConfirm: { Chinese: '确定要删除这段工作经历吗？', English: 'Are you sure you want to delete this work experience?' },
        deleteEducationConfirm: { Chinese: '确定要删除这段教育经历吗？', English: 'Are you sure you want to delete this education entry?' },
        assetCount: { Chinese: '份简历资产', English: 'Resume assets' },
        syncingAssets: { Chinese: '正在同步 AI 资产...', English: 'Syncing AI assets...' },
        statusFailed: { Chinese: '失败', English: 'Failed' },
        retry: { Chinese: '重试', English: 'Retry' },
        generalResume: { Chinese: '通用简历', English: 'General Resume' },
        view: { Chinese: '查看', English: 'View' },
        aiProcessing: { Chinese: 'AI 正在努力生成中，请稍候', English: 'AI is generating, please wait' },
        generateFailed: { Chinese: '生成失败', English: 'Generation failed' },
        tryAgain: { Chinese: '请尝试重新生成', English: 'Please try regenerating' },
        unknownJob: { Chinese: '未知岗位', English: 'Unknown Position' },
        pending: { Chinese: '待处理', English: 'Pending' },
        processing: { Chinese: '处理中', English: 'Processing' },
        completed: { Chinese: '已完成', English: 'Completed' },
        emptyTitle: { Chinese: '还没有 AI 为你定制的简历', English: 'No AI-tailored resumes yet' },
        emptySubtitle: { Chinese: '快去探索岗位，让 AI 帮你写简历吧', English: 'Explore jobs and let AI help you write a resume' },
        goJobs: { Chinese: '去看看岗位', English: 'Job Market' },
        year: { Chinese: '年', English: 'Year' },
        month: { Chinese: '月', English: 'Month' },
        totalPrefix: { Chinese: '共 ', English: 'Total ' },
    },
    jobs: {
        tabPublic: { Chinese: '公开', English: 'Public' },
        tabFeatured: { Chinese: '精选', English: 'Featured' },
        tabSaved: { Chinese: '收藏', English: 'Saved' },
        featuredSubscribeText: { Chinese: '订阅会员后解锁精选岗位', English: 'Subscribe to view featured jobs' },
        featuredLockedTitle: { Chinese: '精选岗位 🔒', English: 'Featured Jobs 🔒' },
        searchPlaceholder: { Chinese: '搜索职位名称..', English: 'Search job title..' },
        filterLabel: { Chinese: '筛选', English: 'Filter' },
        regionAll: { Chinese: '全部', English: 'All' },
        regionDomestic: { Chinese: '国内', English: 'Domestic' },
        regionOverseas: { Chinese: '海外', English: 'Overseas' },
        regionWeb3: { Chinese: 'Web3', English: 'Web3' },
        // Salary options
        salary_all: { Chinese: '全部', English: 'All' },
        salary_lt_10k: { Chinese: '10k以下', English: '< 10K' },
        salary_10_20k: { Chinese: '10-20K', English: '10–20K' },
        salary_20_50k: { Chinese: '20-50K', English: '20–50K' },
        salary_50_plus: { Chinese: '50K以上', English: '50K+' },
        salary_project_parttime: { Chinese: '项目制/兼职', English: 'Project/Part-time' },
        // Experience options
        exp_all: { Chinese: '全部', English: 'All' },
        exp_any: { Chinese: '经验不限', English: 'Any' },
        exp_lt_1y: { Chinese: '1年以内', English: '< 1y' },
        exp_1_3y: { Chinese: '1-3年', English: '1–3y' },
        exp_3_5y: { Chinese: '3-5年', English: '3–5y' },
        exp_5_10y: { Chinese: '5-10年', English: '5–10y' },
        exp_10_plus: { Chinese: '10年以上', English: '10y+' },
        // Source options
        source_all: { Chinese: '全部', English: 'All' },
        source_boss: { Chinese: 'BOSS直聘', English: 'BOSS Zhipin' },
        source_zhilian: { Chinese: '智联招聘', English: 'Zhilian Zhaopin' },
        source_wellfound: { Chinese: 'Wellfound', English: 'Wellfound' },
        saveMenuLabel: { Chinese: '功能', English: 'Func' },
        collectAllLabel: { Chinese: '一键收藏当前列表', English: 'Collect All Jobs' },
        saveSearchLabel: { Chinese: '保存搜索条件', English: 'Save Search' },
        restoreSearchLabel: { Chinese: '恢复搜索条件', English: 'Restore Search' },
        editLabel: { Chinese: '编辑', English: 'Edit' },
        doneLabel: { Chinese: '完成', English: 'Done' },
        clearAllLabel: { Chinese: '一键清空', English: 'Clear All' },
        trySaveSearchHint: { Chinese: '试着保存搜索条件吧', English: 'Try saving a search condition' },
        tryAddFilterHint: { Chinese: '试着加入筛选条件吧', English: 'Try adding filter conditions' },
        filterKeywordLabel: { Chinese: '关键词', English: 'Keyword' },
        filterRegionLabel: { Chinese: '区域', English: 'Region' },
        filterSourceLabel: { Chinese: '来源', English: 'Source' },
        filterSalaryLabel: { Chinese: '薪资', English: 'Salary' },
        noFilterConditions: { Chinese: '无筛选条件', English: 'No filter conditions' },
        noSavedSearchConditions: { Chinese: '暂无保存的搜索条件', English: 'No saved search conditions' },
        loading: { Chinese: '加载中...', English: 'Loading...' },
        loadFailed: { Chinese: '加载失败', English: 'Load failed' },
        allDataLoaded: { Chinese: '已加载全部数据', English: 'All data loaded' },
        copyLink: { Chinese: '复制链接', English: 'Copy Link' },
        contentEmpty: { Chinese: '内容为空', English: 'Content is empty' },
        applyMenuTitle: { Chinese: '申请岗位', English: 'Quick Apply' },
        copySourceLink: { Chinese: '复制来源链接', English: 'Copy Source Link' },
        aiResumeGenerate: { Chinese: 'AI简历生成', English: 'AI Resume Builder' },
        // REMOVED: oneClickSubmitResume
        oneClickSubmitResume: { Chinese: '已停用', English: 'Disabled' },
        noSourceLink: { Chinese: '暂无来源链接', English: 'No source link available' },
        linkCopied: { Chinese: '链接已复制', English: 'Link copied' },
        featureDeveloping: { Chinese: '功能开发中', English: 'Feature under development' },
        dataLoadFailed: { Chinese: '数据加载失败', English: 'Failed to load data' },
        pleaseLogin: { Chinese: '请先绑定手机号', English: 'Please bind your phone number first' },
        saveSuccess: { Chinese: '收藏成功', English: 'Saved successfully' },
        unsaveSuccess: { Chinese: '已取消收藏', English: 'Unsaved successfully' },
        operationFailed: { Chinese: '操作失败', English: 'Operation failed' },
        unknownCompany: { Chinese: '未知公司', English: 'Unknown Company' },
        confirmClearTitle: { Chinese: '确认清空', English: 'Confirm Clear' },
        confirmClearContent: { Chinese: '确定要删除所有保存的搜索条件吗？', English: 'Are you sure you want to delete all saved search conditions?' },
        unlockFeaturedTitle: { Chinese: '解锁精选岗位 💎', English: 'Unlock Featured Jobs 💎' },
        unlockFeaturedContent: { Chinese: '当前为“试用会员”或“非会员”状态。订阅会员后，即可无限制查看所有海外/Web3高薪远程机会，并解锁 AI 简历优化等全部特权。', English: 'Subscribe to unlock unlimited access to Overseas/Web3 jobs and AI features.' },
        goSubscribe: { Chinese: '去订阅', English: 'Subscribe' },
        thinkAgain: { Chinese: '再想想', English: 'Later' },
        cleared: { Chinese: '已清空', English: 'Cleared' },
        clearFailed: { Chinese: '清空失败', English: 'Clear failed' },
        deleteFailed: { Chinese: '删除失败', English: 'Delete failed' },
        generatedResumeExistsTitle: { Chinese: '已生成过简历', English: 'Already Generated Resume' },
        generatedResumeExistsContent: { Chinese: '您已为该岗位生成过定制简历，是否需要重新生成？', English: 'You already generated a customized resume for this job. Regenerate?' },
        generatedResumeExistsConfirm: { Chinese: '重新生成', English: 'Regenerate' },
        generatedResumeExistsCancel: { Chinese: '查看简历', English: 'View Resumes' },
        generateRequestSubmittedTitle: { Chinese: '生成请求已提交', English: 'Request Submitted' },
        generateRequestSubmittedContent: { Chinese: 'AI 正在为你深度定制简历，大约需要 30 秒。完成后将在“我的简历”中展示，你可以继续浏览其他岗位。', English: 'AI is customizing your resume, usually takes 30s. Check "Generated Resumes" later.' },
        generateRequestSubmittedConfirm: { Chinese: '去看看', English: 'Check' },
        generateRequestSubmittedCancel: { Chinese: '留在本页', English: 'Stay' },
        generatingTitle: { Chinese: '生成中', English: 'Processing' },
        generatingContent: { Chinese: '该岗位的定制简历还在生成中，请耐心等待，无需重复提交。', English: 'Resume for this job is still being generated. Please wait.' },
        generatingConfirm: { Chinese: '知道了', English: 'OK' },
        quotaExhaustedTitle: { Chinese: '生成额度已用完', English: 'Quota Exhausted' },
        quotaExhaustedContent: { Chinese: '您的简历生成额度已用完，请升级或补充算力。', English: 'Your resume generation quota has been used up. Please upgrade or top-up points.' },
        quotaExhaustedConfirm: { Chinese: '去升级', English: 'Upgrade' },
        quotaExhaustedCancel: { Chinese: '取消', English: 'Cancel' },
        generateFailedTitle: { Chinese: '生成失败', English: 'Generate Failed' },
        profileIncompleteTitle: { Chinese: '简历信息不完整', English: 'Profile Incomplete' },
        profileIncompleteContent: { Chinese: '为了生成效果，请先补全当前语言简历的基础资料（姓名、联系方式、教育及工作经历）。', English: 'Please complete your current language profile (Name, Contact, Education and Work Experience) first.' },
        profileIncompleteConfirm: { Chinese: '去完善', English: 'Edit Profile' },
    },
    drawer: {
        salary: { Chinese: '薪资', English: 'Salary' },
        experience: { Chinese: '经验', English: 'Experience' },
        regionTitle: { Chinese: '工作类型', English: 'Job Type' },
        sourceTitle: { Chinese: '招聘软件', English: 'Job Board' },
        clear: { Chinese: '清除', English: 'Clear' },
        confirm: { Chinese: '确定', English: 'Apply' },
    },
    app: {
        navTitle: { Chinese: '🌍 远程工作机会', English: '🌍 Remote Jobs', AIChinese: '🌍 远程工作机会' },
        maintenanceMsg: { Chinese: '为了给您提供更好的服务，系统正在维护升级中，请稍后再试。', English: 'To provide better service, the system is under maintenance. Please try again later.' },
    },
} as const

export type I18nKey =
    | 'tab.jobs'
    | 'tab.me'
    | 'me.title'
    | 'me.favoritesEntry'
    | 'me.languageEntry'
    | 'me.langChinese'
    | 'me.langChineseDesc'
    | 'me.langEnglishDesc'
    | 'me.langAIChinese'
    | 'me.langAIChineseDesc'
    | 'me.langAIEnglish'
    | 'me.langAIEnglishDesc'
    | 'me.comingSoon'
    | 'me.loginSuccess'
    | 'me.phoneAuthFailed'
    | 'me.phoneAuthRequired'
    | 'me.openDetailFailed'
    | 'me.loadFavoritesFailed'
    | 'me.emptyFavorites'
    | 'me.generateResumeEntry'
    | 'me.language'
    | 'me.inviteCodeEntry'
    | 'me.myInviteCode'
    | 'me.inputInviteCode'
    | 'me.inviteCodeCopied'
    | 'me.inviteCodeInvalid'
    | 'me.inviteCodeApplied'
    | 'me.inviteFriendPlan'
    | 'me.inviteRewardDesc'
    | 'me.iHaveInviteCode'
    | 'me.clickToCopy'
    | 'me.redeem'
    | 'me.langEnglish'
    | 'me.memberBadge'
    | 'me.uploadAvatar'
    | 'me.editNickname'
    | 'me.memberExpiredDate'
    | 'me.phoneNumber'
    | 'me.changePhone'
    | 'me.nicknameTooLong'
    | 'me.resumeProfileEntry'
    | 'jobs.tabPublic'
    | 'jobs.tabFeatured'
    | 'jobs.tabSaved'
    | 'jobs.featuredSubscribeText'
    | 'jobs.featuredLockedTitle'
    | 'jobs.searchPlaceholder'
    | 'jobs.filterLabel'
    | 'jobs.regionAll'
    | 'jobs.regionDomestic'
    | 'jobs.regionOverseas'
    | 'jobs.regionWeb3'
    | 'jobs.saveMenuLabel'
    | 'jobs.collectAllLabel'
    | 'jobs.saveSearchLabel'
    | 'jobs.restoreSearchLabel'
    | 'jobs.editLabel'
    | 'jobs.doneLabel'
    | 'jobs.clearAllLabel'
    | 'jobs.trySaveSearchHint'
    | 'jobs.tryAddFilterHint'
    | 'jobs.filterKeywordLabel'
    | 'jobs.filterRegionLabel'
    | 'jobs.filterSourceLabel'
    | 'jobs.filterSalaryLabel'
    | 'jobs.noFilterConditions'
    | 'jobs.noSavedSearchConditions'
    | 'jobs.loading'
    | 'jobs.loadFailed'
    | 'jobs.allDataLoaded'
    | 'jobs.copyLink'
    | 'jobs.contentEmpty'
    | 'jobs.applyMenuTitle'
    | 'jobs.copySourceLink'
    | 'jobs.aiResumeGenerate'
    | 'jobs.oneClickSubmitResume'
    | 'jobs.noSourceLink'
    | 'jobs.linkCopied'
    | 'jobs.featureDeveloping'
    | 'jobs.dataLoadFailed'
    | 'jobs.pleaseLogin'
    | 'jobs.saveSuccess'
    | 'jobs.unsaveSuccess'
    | 'jobs.operationFailed'
    | 'drawer.salary'
    | 'drawer.experience'
    | 'drawer.regionTitle'
    | 'drawer.sourceTitle'
    | 'drawer.clear'
    | 'drawer.confirm'
    | 'resume.toolTitle'
    | 'resume.toolSubtitle'
    | 'resume.toolScreenshotTitle'
    | 'resume.toolScreenshotDesc'
    | 'resume.toolTextTitle'
    | 'resume.toolTextDesc'
    | 'resume.toolRefineTitle'
    | 'resume.toolRefineDesc'
    | 'resume.confirmGenerate'
    | 'resume.jdPlaceholder'
    | 'resume.experience'
    | 'resume.experiencePlaceholder'
    | 'resume.jobDescription'
    | 'resume.title'
    | 'resume.tabCn'
    | 'resume.tabEn'
    | 'resume.syncFromCn'
    | 'resume.universityPlaceholder'
    | 'resume.whatsapp'
    | 'resume.telegram'
    | 'resume.linkedin'
    | 'resume.tips'
    | 'resume.tipsComplete'
    | 'resume.tipsPerfect'
    | 'resume.personalInfo'
    | 'resume.contactInfo'
    | 'resume.name'
    | 'resume.realName'
    | 'resume.nameEn'
    | 'resume.location'
    | 'resume.phoneEn'
    | 'resume.personalWebsite'
    | 'resume.gender'
    | 'resume.birthday'
    | 'resume.identity'
    | 'resume.photo'
    | 'resume.wechat'
    | 'resume.email'
    | 'resume.phone'
    | 'resume.education'
    | 'resume.degree'
    | 'resume.major'
    | 'resume.startDate'
    | 'resume.endDate'
    | 'resume.schoolPlaceholder'
    | 'resume.majorPlaceholder'
    | 'resume.degreePlaceholder'
    | 'resume.genderPlaceholder'
    | 'resume.identityPlaceholder'
    | 'resume.birthdayPlaceholder'
    | 'resume.namePlaceholder'
    | 'resume.description'
    | 'resume.descriptionPlaceholder'
    | 'resume.optional'
    | 'resume.certificates'
    | 'resume.graduationDate'
    | 'resume.timePeriod'
    | 'resume.workExperience'
    | 'resume.company'
    | 'resume.companyPlaceholder'
    | 'resume.jobTitle'
    | 'resume.jobTitlePlaceholder'
    | 'resume.businessDirection'
    | 'resume.businessDirectionPlaceholder'
    | 'resume.workContent'
    | 'resume.workContentPlaceholder'
    | 'resume.addWorkExperience'
    | 'resume.aiMessageLabel'
    | 'resume.aiMessageDefault'
    | 'resume.addEducation'
    | 'resume.skills'
    | 'resume.addSkill'
    | 'resume.skillPlaceholder'
    | 'resume.certificates'
    | 'resume.addCertificate'
    | 'resume.certificatesPlaceholder'
    | 'resume.noData'
    | 'resume.save'
    | 'resume.saveSuccess'
    | 'resume.saveFailed'
    | 'resume.cancel'
    | 'resume.delete'
    | 'resume.toPresent'
    | 'resume.degreeOptions'
    | 'resume.studyTypes'
    | 'resume.genderOptions'
    | 'resume.identityOptions'
    | 'resume.assetCount'
    | 'resume.syncingAssets'
    | 'resume.statusFailed'
    | 'resume.generalResume'
    | 'resume.view'
    | 'resume.aiProcessing'
    | 'resume.generateFailed'
    | 'resume.tryAgain'
    | 'resume.unknownJob'
    | 'resume.pending'
    | 'resume.processing'
    | 'resume.completed'
    | 'resume.emptyTitle'
    | 'resume.emptySubtitle'
    | 'resume.goJobs'
    | 'resume.retrying'
    | 'resume.deleteResumeConfirm'
    | 'resume.deleting'
    | 'resume.deleteSuccess'
    | 'resume.deleteFailedShort'
    | 'resume.errorShort'
    | 'resume.loadingFailed'
    | 'resume.fetchingFile'
    | 'resume.recoveringExpiredFile'
    | 'resume.cloudRerenderingToast'
    | 'resume.oldFileUnavailable'
    | 'resume.cannotOpenDocument'
    | 'resume.downloadFailed'
    | 'resume.year'
    | 'resume.month'
    | 'jobs.unknownCompany'
    | 'jobs.confirmClearTitle'
    | 'jobs.confirmClearContent'
    | 'jobs.unlockFeaturedTitle'
    | 'jobs.unlockFeaturedContent'
    | 'jobs.goSubscribe'
    | 'jobs.thinkAgain'
    | 'jobs.cleared'
    | 'jobs.clearFailed'
    | 'jobs.deleteFailed'
    | 'jobs.checkingStatus'
    | 'jobs.checkFailed'
    | 'jobs.generatedResumeExistsTitle'
    | 'jobs.generatedResumeExistsContent'
    | 'jobs.generatedResumeExistsConfirm'
    | 'jobs.generatedResumeExistsCancel'
    | 'jobs.generateRequestSubmittedTitle'
    | 'jobs.generateRequestSubmittedContent'
    | 'jobs.generateRequestSubmittedConfirm'
    | 'jobs.generateRequestSubmittedCancel'
    | 'jobs.generatingTitle'
    | 'jobs.generatingContent'
    | 'jobs.generatingConfirm'
    | 'jobs.quotaExhaustedTitle'
    | 'jobs.quotaExhaustedContent'
    | 'jobs.quotaExhaustedConfirm'
    | 'jobs.quotaExhaustedCancel'
    | 'jobs.generateFailedTitle'
    | 'jobs.profileIncompleteTitle'
    | 'jobs.profileIncompleteContent'
    | 'jobs.profileIncompleteConfirm'
    | 'jobs.salary_all'
    | 'jobs.salary_lt_10k'
    | 'jobs.salary_10_20k'
    | 'jobs.salary_20_50k'
    | 'jobs.salary_50_plus'
    | 'jobs.salary_project_parttime'
    | 'jobs.exp_all'
    | 'jobs.exp_any'
    | 'jobs.exp_lt_1y'
    | 'jobs.exp_1_3y'
    | 'jobs.exp_3_5y'
    | 'jobs.exp_5_10y'
    | 'jobs.exp_10_plus'
    | 'jobs.source_all'
    | 'jobs.source_boss'
    | 'jobs.source_zhilian'
    | 'jobs.source_wellfound'
    | 'me.startAfterEnd'
    | 'me.endBeforeStart'
    | 'me.selectStartTime'
    | 'me.selectEndTime'
    | 'me.appShareTitle'
    | 'resume.syncConfirmTitle'
    | 'resume.syncConfirmContent'
    | 'resume.synced'
    | 'resume.deleteWorkConfirm'
    | 'resume.deleteEducationConfirm'
    | 'me.qrHint'
    | 'me.generatedResumesEntry'
    | 'me.loading'
    | 'me.loginNow'
    | 'me.viewEditProfile'
    | 'me.regularUser'
    | 'me.jobQuota'
    | 'me.memberFullAccess'
    | 'me.unlockAIFeatures'
    | 'me.upgradeGuide'
    | 'me.manageBenefits'
    | 'me.unlockNow'
    | 'me.resumeProfileSubtitle'
    | 'me.generatedResumesSubtitle'
    | 'me.basicMode'
    | 'me.aiMode'
    | 'me.vipTag'
    | 'me.inputInviteCodePlaceholder'
    | 'me.copy'
    | 'me.apply'
    | 'me.contactAuthor'
    | 'me.contactAuthorDesc'
    | 'me.authorWechatSlogan'
    | 'me.wechatIdCopied'
    | 'me.shareDesc'
    | 'me.expiresSuffix'
    | 'me.aiQuotaTitle'
    | 'me.unlimitedUse'
    | 'me.unlimited'
    | 'me.quotaUsed'
    | 'me.totalQuota'
    | 'me.renewNow'
    | 'me.upgradeAmountText'
    | 'me.userProfileTitle'
    | 'me.notSet'
    | 'me.benefitTranslateTitle'
    | 'me.benefitTranslateSub'
    | 'me.benefitResumeTitle'
    | 'me.benefitResumeSub'
    | 'me.aiUnlockTitle'
    | 'me.aiUnlockContent'
    | 'me.toPay'
    | 'me.settingsUpdated'
    | 'me.loadInviteCodeFailed'
    | 'me.uploading'
    | 'me.uploadSuccess'
    | 'me.uploadFailed'
    | 'me.nicknameEmpty'
    | 'me.saving'
    | 'me.nicknameSuccess'
    | 'me.updateFailed'
    | 'me.memberRenew'
    | 'me.memberRenewContent'
    | 'me.upgradeBasicTitle'
    | 'me.upgradeBasicContent'
    | 'me.upgradeProTitle'
    | 'me.upgradeProContent'
    | 'me.creatingOrder'
    | 'me.activatingMember'
    | 'me.paySuccess'
    | 'me.payCancelled'
    | 'me.payPrompt'
    | 'me.payError'
    | 'me.notActivated'
    | 'me.notBound'
    | 'me.phoneUpdateSuccess'
    | 'me.phoneUpdateFailed'
    | 'me.authCancel'
    | 'me.authRequiredTitle'
    | 'me.authRequiredContent'
    | 'me.authRequiredConfirm'
    | 'me.publishSkillEntry'
    | 'me.applyFailed'
    | 'me.orderCreateFailed'
    | 'me.payParamMissing'
    | 'me.activateMemberFailed'
    | 'me.mchIdMissing'
    | 'me.phoneWarningTitle'
    | 'me.phoneWarningContent'
    | 'me.phoneWarningConfirm'
    | 'me.paymentPhoneRequired'
    | 'tab.jobs'
    | 'tab.resume'
    | 'tab.positions'
    | 'tab.me'
    | 'app.navTitle'
    | 'app.maintenanceMsg'

function getByPath(obj: any, path: string) {
    return path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj)
}

/**
 * Get a localized string or object from the dictionary.
 */
export function t<T = string>(key: I18nKey, language?: AppLanguage): T {
    if (!language) {
        const app = getApp<IAppOption>()
        language = normalizeLanguage(app?.globalData?.language)
    }
    const item = getByPath(dict, key)
    const value = item?.[language]
    
    if (value !== undefined) return value as T
    
    // Fallback logic
    let fallback: any
    if (language === 'AIEnglish') {
        fallback = item?.['English'] || item?.['Chinese']
    }
    else if (language === 'AIChinese') {
        fallback = item?.['Chinese'] || item?.['English']
    }
    else {
        fallback = item?.['Chinese'] || item?.['English']
    }
    
    return (fallback !== undefined ? fallback : key) as T
}

export function normalizeLanguage(input: any): AppLanguage {
    const v = typeof input === 'string' ? input.trim() : input
    if (typeof v === 'string') {
        const lower = v.toLowerCase()
        if (v === 'AIEnglish' || v === 'AI英文' || lower === 'aienglish') return 'AIEnglish'
        if (v === 'AIChinese' || v === 'AI全中文' || lower === 'aichinese') return 'AIChinese'
        if (v === 'English' || v === '英文' || v === 'en' || v === 'EN' || lower === 'english' || lower === 'en') return 'English'
        if (lower === 'chinese' || lower === 'zh' || lower === 'zh-cn' || lower === 'zh-hans') return 'Chinese'
    }
    return 'Chinese'
}
