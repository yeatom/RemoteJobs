export type AppLanguage = 'Chinese' | 'English' | 'AIChinese' | 'AIEnglish'

// One source of truth for supported languages
export const SUPPORTED_LANGUAGES: AppLanguage[] = ['Chinese', 'English', 'AIChinese', 'AIEnglish']

// Simple key-based dictionary for UI text.
// NOTE: Job content is excluded by design.
const dict = {
    tab: {
        community: { Chinese: '社区', English: 'Community' },
        jobs: { Chinese: '岗位', English: 'Jobs' },
        me: { Chinese: '我', English: 'Me' },
    },
    me: {
        title: { Chinese: '我', English: 'Me' },
        favoritesEntry: { Chinese: '我收藏的岗位', English: 'Saved jobs' },
        languageEntry: { Chinese: '语言', English: 'Language' },
        langChinese: { Chinese: '中文', English: 'Chinese' },
        comingSoon: { Chinese: '敬请期待', English: 'Coming soon' },
        loginSuccess: { Chinese: '登录成功', English: 'Logged in' },
        phoneAuthFailed: { Chinese: '手机号授权失败', English: 'Phone authorization failed' },
        phoneAuthRequired: { Chinese: '请先授权手机号', English: 'Please authorize your phone number' },
        openDetailFailed: { Chinese: '无法打开详情', English: 'Unable to open details' },
        loadFavoritesFailed: { Chinese: '加载收藏失败', English: 'Failed to load saved jobs' },
        emptyFavorites: { Chinese: '暂无收藏岗位', English: 'No saved jobs' },
        generateResumeEntry: { Chinese: '生成简历', English: 'Generate Resume' },
        publishSkillEntry: { Chinese: '发布技能', English: 'Publish Skill' },
        aiTranslateEntry: { Chinese: 'AI岗位翻译', English: 'AI Translate' },
        language: { Chinese: '语言', English: 'Language' },
        inviteCodeEntry: { Chinese: '邀请码', English: 'Invite Code' },
        myInviteCode: { Chinese: '我的邀请码', English: 'My Invite Code' },
        inputInviteCode: { Chinese: '输入邀请码', English: 'Enter Invite Code' },
        inviteCodeCopied: { Chinese: '邀请码已复制', English: 'Invite code copied' },
        inviteCodeInvalid: { Chinese: '邀请码格式不正确', English: 'Invalid invite code format' },
        inviteCodeApplied: { Chinese: '邀请码已应用', English: 'Invite code applied successfully' },
        // Language selector labels (also used in AI Translate popup)
        langDefault: { Chinese: '中文', English: '中文' },
        langEnglish: { Chinese: 'English', English: 'English' },
        aiTranslateDefault: { Chinese: '默认', English: 'Default' },
        langAI: { Chinese: 'AI岗位信息提炼和翻译', English: 'AI Job Intel Extract & Translate' },
        memberBadge: { Chinese: '丈月尺会员', English: 'Subscribed' },
        uploadAvatar: { Chinese: '上传头像', English: 'Upload Avatar' },
        editNickname: { Chinese: '用户名', English: 'Username' },
        memberExpiredDate: { Chinese: '会员到期日期', English: 'Expiration Date' },
        phoneNumber: { Chinese: '手机号', English: 'Phone Number' },
        changePhone: { Chinese: '更换', English: 'Change' },
        nicknameTooLong: { Chinese: '用户名太长了', English: 'Nickname is too long' },
        resumeProfileEntry: { Chinese: '简历资料', English: 'Resume Profile' },
        appliedJobsEntry: { Chinese: '投递过的工作', English: 'Applied Jobs' },
    },
    resume: {
        title: { Chinese: '简历资料', English: 'Resume Profile' },
        tips: { Chinese: '完善以下信息，让 AI 更好地为您生成简历', English: 'Complete the info for better AI resume generation' },
        tipsComplete: { Chinese: '信息很完整，快去体验AI简历吧', English: 'Information is very complete, go experience AI Resume!' },
        tipsPerfect: { Chinese: '非常完美，快去体验AI简历吧', English: 'Very perfect, go experience AI Resume!' },
        personalInfo: { Chinese: '基本信息', English: 'Basic Info' },
        contactInfo: { Chinese: '联系方式', English: 'Contact' },
        name: { Chinese: '个人信息', English: 'Personal Profile' },
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
        namePlaceholder: { Chinese: '请输入真实姓名', English: 'Enter your real name' },
        description: { Chinese: '在校描述', English: 'Description' },
        descriptionPlaceholder: { Chinese: '主要课程、荣誉奖励等', English: 'Main courses, honors, etc.' },
        optional: { Chinese: '选填', English: 'Optional' },
        certificates: { Chinese: '证书', English: 'Certificates' },
        graduationDate: { Chinese: '毕业时间', English: 'Graduation Date' },
        timePeriod: { Chinese: '时间段', English: 'Time Period' },
        workExperience: { Chinese: '工作经历', English: 'Work Experience' },
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
        addCertificate: { Chinese: '添加证书', English: 'Add Certificate' },
        noData: { Chinese: '暂无数据', English: 'No data' },
        save: { Chinese: '保存', English: 'Save' },
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
        statusOngoing: { Chinese: '进行中', English: 'Ongoing' },
        langDefault: { Chinese: '默认', English: 'Default' },
        langAIChinese: { Chinese: 'AI 全中文', English: 'AI Chinese' },
        langAIEnglish: { Chinese: 'AI 全英文', English: 'AI English' },
        desc: { Chinese: '敬请期待', English: 'Coming soon' },
    },
    jobs: {
        tabPublic: { Chinese: '公开', English: 'Public' },
        tabFeatured: { Chinese: '精选', English: 'Featured' },
        tabSaved: { Chinese: '收藏', English: 'Saved' },
        featuredSubscribeText: { Chinese: '订阅后查看精选岗位', English: 'Subscribe to view featured jobs' },
        featuredLockedTitle: { Chinese: '精选岗位 🔒', English: 'Featured Jobs 🔒' },
        searchPlaceholder: { Chinese: '搜索职位名称..', English: 'Search job title..' },
        filterLabel: { Chinese: '筛选', English: 'Filter' },
        regionDomestic: { Chinese: '国内 ', English: 'China' },
        regionAbroad: { Chinese: '国外 ', English: 'Intl' },
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
        oneClickSubmitResume: { Chinese: '一键投递简历', English: 'Apply with Resume' },
        noSourceLink: { Chinese: '暂无来源链接', English: 'No source link available' },
        linkCopied: { Chinese: '链接已复制', English: 'Link copied' },
        featureDeveloping: { Chinese: '功能开发中', English: 'Feature under development' },
        dataLoadFailed: { Chinese: '数据加载失败', English: 'Failed to load data' },
        pleaseLogin: { Chinese: '请先绑定手机号', English: 'Please bind your phone number first' },
        saveSuccess: { Chinese: '收藏成功', English: 'Saved successfully' },
        unsaveSuccess: { Chinese: '已取消收藏', English: 'Unsaved successfully' },
        operationFailed: { Chinese: '操作失败', English: 'Operation failed' },
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
    | 'me.langEnglish'
    | 'me.comingSoon'
    | 'me.loginSuccess'
    | 'me.phoneAuthFailed'
    | 'me.phoneAuthRequired'
    | 'me.openDetailFailed'
    | 'me.loadFavoritesFailed'
    | 'me.emptyFavorites'
    | 'me.generateResumeEntry'
    | 'me.publishSkillEntry'
    | 'me.aiTranslateEntry'
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
    | 'community.statusOngoing'
    | 'me.langDefault'
    | 'me.langEnglish'
    | 'me.aiTranslateDefault'
    | 'me.langAI'
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
    | 'jobs.regionDomestic'
    | 'jobs.regionAbroad'
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
    | 'resume.tips'
    | 'resume.tipsComplete'
    | 'resume.tipsPerfect'
    | 'resume.personalInfo'
    | 'resume.contactInfo'
    | 'resume.name'
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
    | 'resume.addCertificate'
    | 'resume.noData'
    | 'resume.save'
    | 'resume.cancel'
    | 'resume.delete'
    | 'resume.toPresent'
    | 'resume.degreeOptions'
    | 'resume.studyTypes'
    | 'resume.genderOptions'
    | 'resume.identityOptions'
    | 'tab.jobs'
    | 'app.navTitle'

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
