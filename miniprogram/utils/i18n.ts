export type AppLanguage = 'Chinese' | 'English' | 'AIChinese' | 'AIEnglish'

// One source of truth for supported languages
export const SUPPORTED_LANGUAGES: AppLanguage[] = ['Chinese', 'English', 'AIChinese', 'AIEnglish']

// Simple key-based dictionary for UI text.
// NOTE: Job content is excluded by design.
const dict = {
    tab: {
        community: { Chinese: '社区', English: 'Community' },
        jobs: { Chinese: '岗位', English: 'Jobs' },
        positions: { Chinese: '职位', English: 'Positions' },
        me: { Chinese: '我', English: 'Me' },
    },
    me: {
        title: { Chinese: '我', English: 'Me' },
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
        appliedJobsEntry: { Chinese: '投递记录', English: 'Applied Jobs' },
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
        generatedResumesSubtitle: { Chinese: '预览及下载 PDF 简历', English: 'Preview & download PDF resumes' },
        appliedJobsSubtitle: { Chinese: '追踪简历投递进度', English: 'Track job application status' },
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
        benefitApplyTitle: { Chinese: '一键投递简历', English: 'One-Click Apply' },
        benefitApplySub: { Chinese: '极速直达招聘方，解决网络投递难题', English: 'Reach recruiters directly' },
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
        publishSkillEntry: { Chinese: '发布技能', English: 'Publish Skill' },
        applyFailed: { Chinese: '应用失败', English: 'Apply failed' },
        orderCreateFailed: { Chinese: '订单创建失败', English: 'Order creation failed' },
        payParamMissing: { Chinese: '支付参数缺失，请检查云开发后台配置', English: 'Payment parameters missing, please check backend config' },
        activateMemberFailed: { Chinese: '激活会员失败', English: 'Activate membership failed' },
        mchIdMissing: { Chinese: '未能在 env.js 中找到商户号 mchId', English: 'mchId not found in env.js' },
    },
    resume: {
        title: { Chinese: '简历资料', English: 'Resume Profile' },
        tabCn: { Chinese: '中文版', English: 'Chinese' },
        tabEn: { Chinese: '英文版', English: 'English' },
        syncFromCn: { Chinese: '与中文版同步', English: 'Sync from CN' },
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
        companyPlaceholder: { Chinese: '请输入公司名称', English: 'Enter company name' },
        jobTitle: { Chinese: '职位名称', English: 'Job Title' },
        jobTitlePlaceholder: { Chinese: '请输入职位名称', English: 'Enter job title' },
        businessDirection: { Chinese: '业务方向', English: 'Business Direction' },
        businessDirectionPlaceholder: { Chinese: '一句话描述公司的业务方向', English: 'Brief description of company business' },
        addWorkExperience: { Chinese: '添加工作经历', English: 'Add Work Experience' },
        aiMessageLabel: { Chinese: '想对 AI 说的话', English: 'Message to AI' },
        aiMessageDefault: { Chinese: '当工作经验不足时，自动补充工作经历；当过往职位名称与目标岗位不匹配时，根据公司业务方向，灵活变更过往职位名称与工作内容。', English: 'Automatically supplement work experience when experience is insufficient; when past job titles do not match the target position, flexibly change past job titles and work contents based on the company\'s business direction.' },
        addEducation: { Chinese: '添加教育经历', English: 'Add Education' },
        noData: { Chinese: '暂无数据', English: 'No data' },
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
        assetCount: { Chinese: '份简历资产', English: 'Resume assets' },
        syncingAssets: { Chinese: '正在同步 AI 资产...', English: 'Syncing AI assets...' },
        statusApplied: { Chinese: '已投递', English: 'Applied' },
        statusFailed: { Chinese: '失败', English: 'Failed' },
        generalResume: { Chinese: '通用简历', English: 'General Resume' },
        view: { Chinese: '查看', English: 'View' },
        aiProcessing: { Chinese: 'AI 正在努力生成中，请稍候', English: 'AI is generating, please wait' },
        generateFailed: { Chinese: '生成失败', English: 'Generation failed' },
        tryAgain: { Chinese: '请尝试重新生成', English: 'Please try regenerating' },
        appliedAt: { Chinese: '投递时间：', English: 'Applied at: ' },
        unknownJob: { Chinese: '未知岗位', English: 'Unknown Position' },
        pending: { Chinese: '待处理', English: 'Pending' },
        processing: { Chinese: '处理中', English: 'Processing' },
        completed: { Chinese: '已完成', English: 'Completed' },
        emptyTitle: { Chinese: '还没有 AI 为你定制的简历', English: 'No AI-tailored resumes yet' },
        emptySubtitle: { Chinese: '快去探索岗位，让 AI 帮你写简历吧', English: 'Explore jobs and let AI help you write a resume' },
        goJobs: { Chinese: '去看看岗位', English: 'Check out jobs' },
        year: { Chinese: '年', English: 'Year' },
        month: { Chinese: '月', English: 'Month' },
        totalPrefix: { Chinese: '共 ', English: 'Total ' },
    },
    community: {
        title: { Chinese: '社区', English: 'Community' },
        onlineActivitiesTitle: { Chinese: '线上活动', English: 'Online Activities' },
        offlineActivitiesTitle: { Chinese: '线下活动', English: 'Offline Activities' },
        skillExchangeTitle: { Chinese: '技能交换', English: 'Skill Exchange' },
        successStoriesTitle: { Chinese: '成功森林', English: 'Success Stories' },
        statusActive: { Chinese: '报名中', English: 'Open' },
        statusEnded: { Chinese: '已结束', English: 'Ended' },
        statusUpcoming: { Chinese: '即将开始', English: 'Coming Soon' },
        desc: { Chinese: '敬请期待', English: 'Coming soon' },
        all: { Chinese: '全部', English: 'All' },
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
    | 'tab.community'
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
    | 'community.title'
    | 'community.onlineActivitiesTitle'
    | 'community.offlineActivitiesTitle'
    | 'community.skillExchangeTitle'
    | 'community.successStoriesTitle'
    | 'community.statusActive'
    | 'community.statusEnded'
    | 'community.statusUpcoming'
    | 'me.langEnglish'
    | 'me.memberBadge'
    | 'me.uploadAvatar'
    | 'me.editNickname'
    | 'me.memberExpiredDate'
    | 'me.phoneNumber'
    | 'me.changePhone'
    | 'me.nicknameTooLong'
    | 'me.resumeProfileEntry'
    | 'me.appliedJobsEntry'
    | 'community.desc'
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
    | 'resume.statusApplied'
    | 'resume.statusFailed'
    | 'resume.generalResume'
    | 'resume.view'
    | 'resume.aiProcessing'
    | 'resume.generateFailed'
    | 'resume.tryAgain'
    | 'resume.appliedAt'
    | 'resume.unknownJob'
    | 'resume.pending'
    | 'resume.processing'
    | 'resume.completed'
    | 'resume.emptyTitle'
    | 'resume.emptySubtitle'
    | 'resume.goJobs'
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
    | 'me.appliedJobsSubtitle'
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
    | 'me.benefitApplyTitle'
    | 'me.benefitApplySub'
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
    | 'app.navTitle'
    | 'app.maintenanceMsg'

function getByPath(obj: any, path: string) {
    return path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj)
}

/**
 * Get a localized string or object from the dictionary.
 */
export function t<T = string>(key: I18nKey, language: AppLanguage): T {
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
