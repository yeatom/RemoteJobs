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
        userNotLoggedIn: { Chinese: '用户未登录', English: 'Not logged in' },
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
        editNickname: { Chinese: '修改用户名', English: 'Edit Username' },
        memberExpiredDate: { Chinese: '会员到期日期', English: 'Expiration Date' },
        phoneNumber: { Chinese: '手机号', English: 'Phone Number' },
        changePhone: { Chinese: '更换', English: 'Change' },
        resumeProfileEntry: { Chinese: '简历资料', English: 'Resume Profile' },
        appliedJobsEntry: { Chinese: '投递过的工作', English: 'Applied Jobs' },
    },
    resume: {
        name: { Chinese: '个人姓名', English: 'Name' },
        photo: { Chinese: '照片', English: 'Photo' },
        wechat: { Chinese: '微信号', English: 'WeChat' },
        email: { Chinese: '邮箱', English: 'Email' },
        phone: { Chinese: '手机号', English: 'Phone' },
        education: { Chinese: '毕业院校', English: 'Education' },
        certificates: { Chinese: '证书', English: 'Certificates' },
        graduationDate: { Chinese: '毕业时间', English: 'Graduation Date' },
        addEducation: { Chinese: '添加教育经历', English: 'Add Education' },
        addCertificate: { Chinese: '添加证书', English: 'Add Certificate' },
        noData: { Chinese: '暂无数据', English: 'No data' },
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
        pleaseLogin: { Chinese: '请先登录/绑定手机号', English: 'Please login/bind phone number first' },
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
    | 'me.userNotLoggedIn'
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
    | 'drawer.salary'
    | 'drawer.experience'
    | 'drawer.regionTitle'
    | 'drawer.sourceTitle'
    | 'drawer.clear'
    | 'drawer.confirm'
    | 'resume.name'
    | 'resume.photo'
    | 'resume.wechat'
    | 'resume.email'
    | 'resume.phone'
    | 'resume.education'
    | 'resume.certificates'
    | 'resume.graduationDate'
    | 'resume.addEducation'
    | 'resume.addCertificate'
    | 'resume.noData'
    | 'tab.jobs'
    | 'app.navTitle'

function getByPath(obj: any, path: string) {
    return path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj)
}

export function t(key: I18nKey, language: AppLanguage): string {
    const item = getByPath(dict, key)
    const value = item?.[language]
    if (typeof value === 'string') return value
    // Fallback logic: AIEnglish -> English, AIChinese -> Chinese, then try the other
    let fallback: string | undefined
    if (language === 'AIEnglish') {
        fallback = item?.['English'] || item?.['Chinese']
    }
    else if (language === 'AIChinese') {
        fallback = item?.['Chinese'] || item?.['English']
    }
    else {
        fallback = item?.['Chinese'] || item?.['English']
    }
    return typeof fallback === 'string' ? fallback : key
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
