// miniprogram/pages/resume-profile/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'
import { ui } from '../../utils/ui'
import { callApi, formatFileUrl } from '../../utils/request'
import * as UIConfig from './ui.config'
const { serverUrl } = require('../../env.js')

Page({
  data: {
    // 个人信息 (当前显示的数据)
    name: '',
    photo: '',
    gender: '',
    birthday: '',
    location: '',
    wechat: '',
    email: '',
    phone: '',
    phone_en: '',
    personal_website: '',
    whatsapp: '',
    telegram: '',
    linkedin: '',
    currentLang: 'Chinese', // 'Chinese' or 'English'
    zh: {} as any,
    en: {} as any,
    showSkillsDrawer: false,
    showCertificatesDrawer: false,
    skillsForm: [] as string[],
    certificatesForm: [] as string[],
    // 教育经历（可以有多个）
    educations: [] as Array<{ 
      school: string; 
      school_en?: string;
      school_cn?: string;
      country_chinese?: string;
      country_english?: string;
      degree: string; 
      major: string; 
      major_en?: string;
      startDate: string; 
      endDate: string;
      description?: string;
      graduationDate?: string; // 兼容旧版
    }>,
    // 证书
    certificates: [] as string[],
    
    // 编辑状态
    showEduDrawer: false,
    showWorkDrawer: false,
    showBasicInfoDrawer: false,
    showContactInfoDrawer: false,
    showDegreePicker: false,
    degreePickerValue: [0, 0],
    studyTypes: [] as string[],
    showGenderPicker: false,
    showDatePicker: false,
    currentDatePickingField: '', // 'startDate' | 'endDate' | 'birthday'
    datePickerValue: [0, 0],
    years: [] as number[],
    months: [] as number[],
    skills: [] as string[],
    workExperiences: [] as Array<{
      company: string;
      jobTitle: string;
      businessDirection: string;
      workContent?: string;
      startDate: string;
      endDate: string;
    }>,
    aiMessage: '',
    showAiMessageSheet: false,
    aiMessageForm: '',
    editingEduIndex: -1, // -1 表示新增
    editingWorkIndex: -1, // -1 表示新增
    universitySuggestions: [] as Array<{ chinese_name: string, english_name: string }>,
    showUniversitySuggestions: false,
    majorSuggestions: [] as Array<{ chinese_name: string, english_name: string }>,
    showMajorSuggestions: false,
    eduForm: {
      school: '',
      school_en: '',
      country_chinese: '',
      country_english: '',
      degree: '',
      major: '',
      major_en: '',
      startDate: '',
      endDate: '',
      description: '',
    },
    workForm: {
      company: '',
      jobTitle: '',
      businessDirection: '',
      workContent: '',
      startDate: '',
      endDate: '',
    },
    basicInfoForm: {
      name: '',
      gender: '',
      birthday: '',
      location: '',
    },
    contactInfoForm: {
      wechat: '',
      email: '',
      phone: '',
      phone_en: '',
      whatsapp: '',
      telegram: '',
      linkedin: '',
      personal_website: '',
    },
    degreeOptions: [] as string[],
    genderOptions: [] as string[],
    
    // UI 文本
    ui: {} as Record<string, any>,
    completeness_cn: 0,
    completeness_en: 0,
    percent_cn: 0,
    percent_en: 0,
    currentPercent: 0,
    currentCompleteness: 0,
    interfaceLang: '',
  },

  onLoad() {
    // attach language-aware behavior
    ;(this as any)._langDetach = attachLanguageAware(this, {
      onLanguageRevive: () => {
        wx.setNavigationBarTitle({ title: '' })
        this.updateLanguage()
      },
    })

    this.updateLanguage()
    this.initDateOptions()
    this.loadResumeData()
  },

  initDateOptions() {
    const years = []
    const currentYear = new Date().getFullYear()
    for (let i = currentYear - 50; i <= currentYear + 10; i++) {
      years.push(i)
    }
    const months = []
    for (let i = 1; i <= 12; i++) {
      months.push(i)
    }
    this.setData({ years, months })
  },

  onUnload() {
    const fn = (this as any)._langDetach
    if (typeof fn === 'function') fn()
    ;(this as any)._langDetach = null
  },

  onShow() {
    wx.setNavigationBarTitle({ title: '' })
    this.updateLanguage()
  },

  onSwitchLang(e: any) {
    const lang = e.currentTarget.dataset.lang
    this.setData({ currentLang: lang }, () => {
      this.updateLanguage()
      this.refreshDisplayData()
    })
  },

  async onSyncFromChinese() {
    const { zh, ui: uiStrings, interfaceLang } = this.data
    if (!zh || Object.keys(zh).length === 0) return

    wx.showModal({
      title: uiStrings.syncFromCn || '同步确认',
      content: interfaceLang === 'English' ? 'Sync from Chinese resume? Current English content will be overwritten.' : '确定要从中文简历同步吗？这会覆盖当前的英文简历内容。',
      success: async (res) => {
        if (res.confirm) {
          // 将中文数据整体移动到英文侧进行保存
          const syncData = JSON.parse(JSON.stringify(zh))
          
          // 排除基本信息，保持独立性
          delete syncData.name;
          // delete syncData.gender;
          // delete syncData.birthday;
          // delete syncData.photo; // Keeps photo synced

          // 特殊处理 1：教育经历中的 school_en/major_en 需要转正
          if (syncData.educations) {
            const degreeMap: Record<string, string> = {
              '大专': 'Associate',
              '本科': 'Bachelor',
              '硕士': 'Master',
              '博士': 'PhD',
              '其他': 'Other'
            }
            const studyTypeMap: Record<string, string> = {
              '全日制': 'Full-time',
              '非全日制': 'Part-time'
            }

            syncData.educations = syncData.educations.map((e: any) => {
              let newDegree = e.degree
              // Parse "Degree (Type)"
              const match = e.degree ? e.degree.match(/^(.+?)\s*\((.+?)\)$/) : null
              
              if (match) {
                const cnDegree = match[1]
                const cnType = match[2]
                const enDegree = degreeMap[cnDegree] || cnDegree
                // English resume: just degree, no study type
                newDegree = enDegree
              } else {
                newDegree = degreeMap[e.degree] || e.degree
              }
              
              return {
                ...e,
                school: e.school_en || e.school,
                major: e.major_en || e.major,
                degree: newDegree
              }
            })
          }

          // 特殊处理 2：性别翻译
          if (syncData.gender) {
            const genderMap: Record<string, string> = {
              '男': 'Male',
              '女': 'Female',
              '保密': 'Secret'
            }
            if (genderMap[syncData.gender]) {
              syncData.gender = genderMap[syncData.gender]
            }
          }

          // 特殊处理 3：所在地，如果中文没填，英文默认中国
          if (!syncData.location) {
            syncData.location = 'China'
          }

          await this.saveResumeProfile(syncData)
          ui.showSuccess(interfaceLang === 'English' ? 'Synced' : '同步成功')
          
          // 重新加载数据
          await this.loadResumeData()
        }
      }
    })
  },

  refreshDisplayData() {
    const { currentLang, zh, en, completeness_cn, completeness_en } = this.data
    const profile = currentLang === 'English' ? en : zh
    
    this.setData({
      name: profile.name || '',
      photo: formatFileUrl(profile.photo) || '',
      gender: profile.gender || '',
      birthday: profile.birthday || '',
      location: profile.location || '',
      wechat: profile.wechat || '',
      email: profile.email || '',
      phone: profile.phone || '',
      phone_en: profile.phone_en || profile.phone || '',
      personal_website: profile.personal_website || '',
      whatsapp: profile.whatsapp || '',
      telegram: profile.telegram || '',
      linkedin: profile.linkedin || '',
      educations: profile.educations || [],
      certificates: profile.certificates || [],
      skills: profile.skills || [],
      workExperiences: profile.workExperiences || [],
      aiMessage: profile.aiMessage || '',
      currentCompleteness: currentLang === 'English' ? completeness_en : completeness_cn,
      currentPercent: currentLang === 'English' ? this.data.percent_en : this.data.percent_cn
    })
  },

  calculateCompleteness(profile: any, lang: string) {
    let score = 0;
    
    // 1. Name: 10%
    if (profile.name) score += 10;
    
    // 2. Photo: 5%
    if (profile.photo) score += 5;
    
    // 3. Gender/Birthday: 5% + 5%
    if (profile.gender) score += 5;
    if (profile.birthday) score += 5;
    
    // 4. Contact: 15% (CN: Phone/Email/Wechat, EN: Email/Phone/etc)
    if (lang === 'Chinese') {
      if (profile.wechat || profile.phone || profile.email) score += 15;
    } else {
      if (profile.email) score += 10;
      if (profile.location) score += 5;
    }
    
    // 5. Educations: 20%
    if ((profile.educations || []).length > 0) score += 20;
    
    // 6. Work Experiences: 20%
    if ((profile.workExperiences || []).length > 0) score += 20;
    
    // 7. Skills: 10%
    if ((profile.skills || []).length > 0) score += 10;
    
    // 8. Certificates: 5%
    if ((profile.certificates || []).length > 0) score += 5;
    
    // 9. AI Message: 5%
    if (profile.aiMessage) score += 5;
    
    // Map score to backend levels (0, 1, 2)
    // Level 1: Meets basic requirements (Name, Contact, Education, Work)
    const hasBasic = !!profile.name && 
                     (lang === 'Chinese' ? (profile.wechat || profile.phone || profile.email) : profile.email) &&
                     (profile.educations || []).length > 0 &&
                     (profile.workExperiences || []).length > 0;
                     
    let level = 0;
    if (hasBasic) {
      level = (score === 100) ? 2 : 1;
    }
    
    return { score, level };
  },

  updateLanguage() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    
    const uiStrings = UIConfig.buildPageUI(lang, this.data)

    const degreeOptions = t<string[]>('resume.degreeOptions', lang)
    const studyTypes = t<string[]>('resume.studyTypes', lang)
    const genderOptions = t<string[]>('resume.genderOptions', lang)

    this.setData({ 
      ui: uiStrings, 
      degreeOptions, 
      studyTypes, 
      genderOptions, 
      interfaceLang: lang 
    })
  },

  updateTips() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)

    this.setData({
      ['ui.tips']: UIConfig.buildPageUI(lang, this.data).tips
    })
  },

  loadResumeData() {
    const app = getApp<IAppOption>() as any
    const user = app?.globalData?.user

    if (user) {
      const profile = user.resume_profile || {}
      
      // 直接从 zh/en 字段获取，不再考虑旧的扁平结构
      const zh = (profile.zh || {}) as any
      const en = (profile.en || {}) as any

      // 设置英文版所在地默认值
      if (!en.location) {
        en.location = 'China'
      }

      // 如果后端有计算好的百分比则优先使用，否则本地计算兜底
      let score_cn = user.resume_percent;
      let score_en = user.resume_percent_en;
      let level_cn = user.resume_completeness;
      let level_en = user.resume_completeness_en;

      if (score_cn === undefined) {
        const res = this.calculateCompleteness(zh, 'Chinese');
        score_cn = res.score;
        level_cn = res.level;
      }
      if (score_en === undefined) {
        const res = this.calculateCompleteness(en, 'English');
        score_en = res.score;
        level_en = res.level;
      }

      this.setData({
        zh,
        en,
        completeness_cn: level_cn,
        completeness_en: level_en,
        percent_cn: score_cn,
        percent_en: score_en
      }, () => {
        this.refreshDisplayData()
        this.updateTips()
      })
    }
  },

  async saveResumeProfile(data: any, showSuccessToast = true, showMask = false) {
    const { ui: uiStrings, currentLang } = this.data
    try {
      ui.showLoading(uiStrings.saving, showMask)

      const isChinese = currentLang === 'Chinese'
      const updates: any = {}
      
      if (isChinese) {
        // 1. Prepare updates for zh
        for (const key in data) {
          updates[`zh.${key}`] = data[key]
        }
        
        // 2. Handle one-way sync (CN -> EN)
        // Note: For education/work lists, we already handled potential English fields in onSaveEducation
        // but since we want they to be independent, we only push what was specifically prepared.
        // If data contains 'en_sync', we apply it to 'en'.
        if (data._en_sync) {
          const syncData = data._en_sync
          for (const key in syncData) {
            updates[`en.${key}`] = syncData[key]
          }
          delete data._en_sync // remove from zh updates
          delete updates[`zh._en_sync`]
        }
      } else {
        // Prepare updates for en only (no sync to zh)
        for (const key in data) {
          updates[`en.${key}`] = data[key]
        }
      }

      const res: any = await callApi('updateUserProfile', { 
        resume_profile: updates
      })
      
      if (res?.result?.ok) {
        const app = getApp<IAppOption>() as any
        app.globalData.user = res.result.user
        this.loadResumeData()
        // ui.hideLoading() // Removed: Allow transition to Success directly
        if (showSuccessToast) {
          ui.showSuccess(uiStrings.saveSuccess)
        }
        return true
      } else {
        throw new Error('保存失败')
      }
    } catch (err) {
      console.error(err)
      ui.hideLoading()
      ui.showError(uiStrings.saveFailed)
      return false
    }
  },

  // UI Event Handlers
  onEditPhoto() {
    const { ui: uiStrings } = this.data
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0]
        wx.showLoading({ title: uiStrings.uploading })
        try {
          wx.uploadFile({
            url: `${serverUrl}/api/upload`,
            filePath: tempFilePath,
            name: 'file',
            header: {
              'x-openid': wx.getStorageSync('user_openid')
            },
            success: async (uploadRes) => {
              const data = JSON.parse(uploadRes.data)
              if (data.success) {
                const payload: any = { photo: data.url }
                await this.saveResumeProfile(payload)
              } else {
                wx.showToast({ title: uiStrings.uploadFailed, icon: 'none' })
              }
            },
            fail: () => {
              wx.showToast({ title: uiStrings.uploadFailed, icon: 'none' })
            },
            complete: () => {
              wx.hideLoading()
            }
          })
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: uiStrings.uploadFailed, icon: 'none' })
        }
      }
    })
  },
  
  // 个人基本信息相关逻辑
  onEditBasicInfo() {
    this.setData({
      showBasicInfoDrawer: true,
      basicInfoForm: {
        name: this.data.name,
        gender: this.data.gender,
        birthday: this.data.birthday,
        location: this.data.location,
      }
    })
  },
  closeBasicInfoDrawer() {
    this.setData({ showBasicInfoDrawer: false })
  },
  onEditContactInfo() {
    this.setData({
      showContactInfoDrawer: true,
      contactInfoForm: {
        wechat: this.data.wechat,
        email: this.data.email,
        phone: this.data.phone,
        phone_en: this.data.phone_en,
        whatsapp: this.data.whatsapp,
        telegram: this.data.telegram,
        linkedin: this.data.linkedin,
        personal_website: this.data.personal_website,
      }
    })
  },
  closeContactInfoDrawer() {
    this.setData({ showContactInfoDrawer: false })
  },
  onContactInput(e: any) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`contactInfoForm.${field}`]: e.detail.value
    })
  },
  async onSaveContactInfo() {
    const { contactInfoForm, currentLang } = this.data
    
    let payload: any = {}
    if (currentLang === 'Chinese') {
      // Chinese fields only
      payload = {
        wechat: contactInfoForm.wechat,
        email: contactInfoForm.email,
        phone: contactInfoForm.phone
      }
    } else {
      // English fields only
      payload = {
        email: contactInfoForm.email,
        phone_en: contactInfoForm.phone_en,
        whatsapp: contactInfoForm.whatsapp,
        telegram: contactInfoForm.telegram,
        linkedin: contactInfoForm.linkedin,
        personal_website: contactInfoForm.personal_website,
      }
    }

    const success = await this.saveResumeProfile(payload, false)
    if (success) {
      ui.showSuccess(this.data.ui.saveSuccess)
      this.closeContactInfoDrawer()
    }
  },
  onBasicNameInput(e: any) {
    this.setData({ 'basicInfoForm.name': e.detail.value })
  },
  onBasicLocationInput(e: any) {
    this.setData({ 'basicInfoForm.location': e.detail.value })
  },
  openGenderPicker() {
    this.setData({ showGenderPicker: true })
  },
  closeGenderPicker() {
    this.setData({ showGenderPicker: false })
  },
  onSelectGender(e: any) {
    this.setData({ 
      'basicInfoForm.gender': e.currentTarget.dataset.value,
      showGenderPicker: false
    })
  },
  openBirthdayPicker() {
    const currentBirthday = this.data.basicInfoForm.birthday
    let yearIndex = this.data.years.indexOf(new Date().getFullYear() - 25) // 默认25岁
    let monthIndex = 0

    if (currentBirthday) {
      const [y, m] = currentBirthday.split('-').map(Number)
      const foundYearIndex = this.data.years.indexOf(y)
      if (foundYearIndex > -1) yearIndex = foundYearIndex
      monthIndex = m - 1
    }

    this.setData({ 
      showDatePicker: true,
      currentDatePickingField: 'birthday',
      datePickerValue: [yearIndex, monthIndex]
    })
  },
  async onSaveBasicInfo() {
    const { basicInfoForm, ui: uiStrings, currentLang } = this.data
    const isEnglish = currentLang === 'English'

    if (!basicInfoForm.name.trim()) {
      wx.showToast({ title: uiStrings.namePlaceholder, icon: 'none' })
      return
    }

    const dataToUpdate: any = {
      gender: basicInfoForm.gender,
      birthday: basicInfoForm.birthday,
      name: basicInfoForm.name,
    }

    // 仅英文侧有所在地字段
    if (isEnglish) {
      dataToUpdate.location = basicInfoForm.location
    }

    await this.saveResumeProfile(dataToUpdate, false)
    ui.showSuccess(this.data.ui.saveSuccess)
    this.closeBasicInfoDrawer()
  },

  // 教育经历相关逻辑
  onAddEducation() {
    this.setData({
      showEduDrawer: true,
      editingEduIndex: -1,
      showUniversitySuggestions: false,
      universitySuggestions: [],
      eduForm: {
        school: '',
        school_en: '',
        country_chinese: '',
        country_english: '',
        degree: '',
        major: '',
        major_en: '',
        startDate: '',
        endDate: '',
        description: '',
      }
    })
  },
  onEditEducation(e: any) {
    const index = e.currentTarget.dataset.index
    const edu = this.data.educations[index]
    
    // Regardless of language, 'edu.school' should contain the school name for the current profile.
    // We use a fallback to school_en/major_en just in case of inconsistent data.
    let displayedSchool = edu.school || edu.school_en || ''
    let displayedMajor = edu.major || edu.major_en || ''

    this.setData({
      showEduDrawer: true,
      editingEduIndex: index,
      showUniversitySuggestions: false,
      universitySuggestions: [],
      showMajorSuggestions: false,
      majorSuggestions: [],
      eduForm: {
        school: displayedSchool,
        school_en: edu.school_en || '',
        country_chinese: edu.country_chinese || '',
        country_english: edu.country_english || '',
        degree: edu.degree || '',
        major: displayedMajor,
        major_en: edu.major_en || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || edu.graduationDate || '', // 兼容
        description: edu.description || '',
      }
    })
  },
  closeEduDrawer() {
    this.setData({ showEduDrawer: false })
  },
  
  // 自定义学历选择器逻辑
  openDegreePicker() {
    // 同时也关闭院校建议，防止遮挡
    this.setData({ showUniversitySuggestions: false })

    const currentDegree = this.data.eduForm.degree
    let degreeIndex = 0
    let typeIndex = 0

    if (currentDegree) {
      // 尝试匹配 "本科 (全日制)" 这种格式
      const match = currentDegree.match(/^(.+?)\s*\((.+?)\)$/)
      if (match) {
        const d = match[1]
        const t = match[2]
        const di = this.data.degreeOptions.indexOf(d)
        const ti = this.data.studyTypes.indexOf(t)
        if (di > -1) degreeIndex = di
        if (ti > -1) typeIndex = ti
      } else {
        // 如果不匹配，尝试简单匹配学历
        const di = this.data.degreeOptions.indexOf(currentDegree)
        if (di > -1) degreeIndex = di
      }
    }

    this.setData({ 
      showDegreePicker: true,
      degreePickerValue: [degreeIndex, typeIndex]
    })
  },
  closeDegreePicker() {
    this.setData({ showDegreePicker: false })
  },
  onDegreePickerChange(e: any) {
    this.setData({ degreePickerValue: e.detail.value })
  },
  onConfirmDegree() {
    const { degreePickerValue, degreeOptions, studyTypes, currentLang } = this.data
    const [dIdx, tIdx] = degreePickerValue
    const degree = degreeOptions[dIdx]
    
    let degreeStr = degree
    if (currentLang === 'Chinese') {
      const type = studyTypes[tIdx || 0]
      degreeStr = `${degree} (${type})`
    }
    
    this.setData({
      'eduForm.degree': degreeStr,
      showDegreePicker: false
    })
  },

  // 自定义日期选择器逻辑
  openDatePicker(e: any) {
    this.setData({ showUniversitySuggestions: false })
    const field = e.currentTarget.dataset.field
    const isWorkField = field.startsWith('work_')
    const actualField = isWorkField ? field.replace('work_', '') : field
    const currentDate = isWorkField ? (this.data.workForm as any)[actualField] : (this.data.eduForm as any)[actualField]
    
    let yearIndex = this.data.years.indexOf(new Date().getFullYear())
    let monthIndex = new Date().getMonth()

    if (currentDate) {
      const [y, m] = currentDate.split('-').map(Number)
      const foundYearIndex = this.data.years.indexOf(y)
      if (foundYearIndex > -1) yearIndex = foundYearIndex
      monthIndex = m - 1
    }

    this.setData({ 
      showDatePicker: true,
      currentDatePickingField: field,
      datePickerValue: [yearIndex, monthIndex]
    })
  },
  closeDatePicker() {
    this.setData({ showDatePicker: false })
  },
  onDatePickerChange(e: any) {
    this.setData({ datePickerValue: e.detail.value })
  },
  onSetToPresent() {
    const field = this.data.currentDatePickingField
    const isWorkField = field.startsWith('work_')
    const actualField = isWorkField ? field.replace('work_', '') : field
    const formPrefix = isWorkField ? 'workForm' : 'eduForm'
    
    this.setData({
      [`${formPrefix}.${actualField}`]: this.data.ui.toPresent,
      showDatePicker: false
    })
  },
  onConfirmDate() {
    const [yIdx, mIdx] = this.data.datePickerValue
    const year = this.data.years[yIdx]
    const month = String(this.data.months[mIdx]).padStart(2, '0')
    const dateStr = `${year}-${month}`
    
    const field = this.data.currentDatePickingField
    
    if (field === 'birthday') {
      this.setData({
        'basicInfoForm.birthday': dateStr,
        showDatePicker: false
      })
      return
    }

    const isWorkField = field.startsWith('work_')
    const actualField = isWorkField ? field.replace('work_', '') : field
    const otherField = actualField === 'startDate' ? 'endDate' : 'startDate'
    const formPrefix = isWorkField ? 'workForm' : 'eduForm'
    const otherDate = (this.data[formPrefix] as any)[otherField]

    // 校验：开始时间不能晚于结束时间
    if (otherDate && dateStr !== this.data.ui.toPresent && otherDate !== this.data.ui.toPresent) {
      if (actualField === 'startDate' && dateStr > otherDate) {
        wx.showToast({ title: '开始时间不能晚于结束时间', icon: 'none' })
        return
      }
      if (actualField === 'endDate' && dateStr < otherDate) {
        wx.showToast({ title: '结束时间不能早于开始时间', icon: 'none' })
        return
      }
    }
    
    this.setData({
      [`${formPrefix}.${actualField}`]: dateStr,
      showDatePicker: false
    })
  },

  async searchUniversities(keyword: string) {
    if (!keyword || keyword.length < 2) {
      this.setData({ showUniversitySuggestions: false })
      return
    }

    try {
      const res: any = await callApi('searchUniversities', { keyword })
      
      const items = res?.result?.data || []
      this.setData({
        universitySuggestions: items,
        showUniversitySuggestions: items.length > 0
      })
    } catch (e) {
      console.error(e)
    }
  },

  onSelectUniversity(e: any) {
    const item = e.currentTarget.dataset.item
    const isEnglish = this.data.currentLang === 'English'
    this.setData({
      'eduForm.school': isEnglish ? item.english_name : item.chinese_name,
      'eduForm.school_en': item.english_name || '',
      'eduForm.country_chinese': item.country_chinese || '',
      'eduForm.country_english': item.country_english || '',
      showUniversitySuggestions: false
    })
  },

  onEduSchoolFocus(e: any) {
    const keyword = e.detail.value
    if (keyword && keyword.length >= 2) {
      this.searchUniversities(keyword)
    }
  },

  onEduSchoolBlur() {
    // 清除可能存在的搜索定时器，防止失焦后搜索结果回来重新打开列表
    if ((this as any)._searchTimer) clearTimeout((this as any)._searchTimer);

    // 延迟关闭，确保点击建议项的事件能先触发
    setTimeout(() => {
      this.setData({ showUniversitySuggestions: false })
    }, 200)
  },

  onEduSchoolInput(e: any) {
    const keyword = e.detail.value
    this.setData({ 
      'eduForm.school': keyword,
      'eduForm.country_chinese': '',
      'eduForm.country_english': '',
      // We don't automatically clear school_en/school_cn here to respect "no automatic change"
      // They will only be updated if a new suggestion is selected.
    })
    
    if ((this as any)._searchTimer) clearTimeout((this as any)._searchTimer);
    (this as any)._searchTimer = setTimeout(() => {
        this.searchUniversities(keyword)
    }, 500)
  },
  onEduDegreeChange(e: any) {
    this.setData({ 'eduForm.degree': this.data.degreeOptions[e.detail.value] })
  },

  async searchMajors(keyword: string) {
    if (!keyword || keyword.length < 2) {
      this.setData({ showMajorSuggestions: false })
      return
    }

    const { degree } = this.data.eduForm
    let levelQuery = ''
    if (degree.includes('本科')) {
      levelQuery = 'Bachelor'
    } else if (degree.includes('硕士')) {
      levelQuery = 'Master'
    }

    if (!levelQuery) {
      this.setData({ showMajorSuggestions: false })
      return
    }

    try {
      const res: any = await callApi('searchMajors', { keyword, level: levelQuery })
      
      const items = res?.result?.data || []
      this.setData({
        majorSuggestions: items,
        showMajorSuggestions: items.length > 0
      })
    } catch (e) {
      console.error(e)
    }
  },

  onSelectMajor(e: any) {
    const item = e.currentTarget.dataset.item
    const isEnglish = this.data.currentLang === 'English'
    this.setData({
      'eduForm.major': isEnglish ? (item.english_name || item.chinese_name) : (item.chinese_name || item.english_name),
      'eduForm.major_en': item.english_name || '',
      showMajorSuggestions: false
    })
  },

  onEduMajorFocus(e: any) {
    const keyword = e.detail.value
    if (keyword && keyword.length >= 2) {
      this.searchMajors(keyword)
    }
  },

  onEduMajorBlur() {
    if ((this as any)._majorSearchTimer) clearTimeout((this as any)._majorSearchTimer);
    
    setTimeout(() => {
      this.setData({ showMajorSuggestions: false })
    }, 200)
  },

  onEduMajorInput(e: any) {
    const keyword = e.detail.value
    this.setData({ 
      'eduForm.major': keyword,
      showMajorSuggestions: false // Fixed typo from showUniversitySuggestions
    })

    if ((this as any)._majorSearchTimer) clearTimeout((this as any)._majorSearchTimer);
    (this as any)._majorSearchTimer = setTimeout(() => {
        this.searchMajors(keyword)
    }, 500)
  },
  onEduStartDateChange(e: any) {
    this.setData({ 
      'eduForm.startDate': e.detail.value,
      showUniversitySuggestions: false
    })
  },
  onEduEndDateChange(e: any) {
    this.setData({ 
      'eduForm.endDate': e.detail.value,
      showUniversitySuggestions: false
    })
  },
  onEduDescriptionInput(e: any) {
    this.setData({ 
      'eduForm.description': e.detail.value,
      showUniversitySuggestions: false
    })
  },
  
  // 工作经历相关逻辑
  onAddWorkExperience() {
    this.setData({
      showWorkDrawer: true,
      editingWorkIndex: -1,
      workForm: {
        company: '',
        jobTitle: '',
        businessDirection: '',
        workContent: '',
        startDate: '',
        endDate: '',
      }
    })
  },
  onEditWorkExperience(e: any) {
    const index = e.currentTarget.dataset.index
    const work = this.data.workExperiences[index]
    this.setData({
      showWorkDrawer: true,
      editingWorkIndex: index,
      workForm: {
        company: work.company || '',
        jobTitle: work.jobTitle || '',
        businessDirection: work.businessDirection || '',
        workContent: work.workContent || '',
        startDate: work.startDate || '',
        endDate: work.endDate || '',
      }
    })
  },
  closeWorkDrawer() {
    this.setData({ showWorkDrawer: false })
  },
  onWorkCompanyInput(e: any) {
    this.setData({ 'workForm.company': e.detail.value })
  },
  onWorkJobTitleInput(e: any) {
    this.setData({ 'workForm.jobTitle': e.detail.value })
  },
  onWorkBusinessDirectionInput(e: any) {
    this.setData({ 'workForm.businessDirection': e.detail.value })
  },
  onWorkContentInput(e: any) {
    this.setData({ 'workForm.workContent': e.detail.value })
  },
  async onSaveWorkExperience() {
    const { workForm, editingWorkIndex, workExperiences, ui: uiStrings, currentLang } = this.data
    
    if (!workForm.company.trim()) {
      wx.showToast({ title: uiStrings.companyPlaceholder || '请输入公司名称', icon: 'none' })
      return
    }
    if (!workForm.jobTitle.trim()) {
      wx.showToast({ title: uiStrings.jobTitlePlaceholder || '请输入职位名称', icon: 'none' })
      return
    }
    if (!workForm.startDate) {
      wx.showToast({ title: '请选择开始时间', icon: 'none' })
      return
    }
    if (!workForm.endDate) {
      wx.showToast({ title: '请选择结束时间', icon: 'none' })
      return
    }

    if (workForm.startDate && workForm.endDate && workForm.startDate !== uiStrings.toPresent && workForm.endDate !== uiStrings.toPresent) {
      if (workForm.startDate > workForm.endDate) {
        wx.showToast({ title: '开始时间不能晚于结束时间', icon: 'none' })
        return
      }
    }

    const newWorks = [...workExperiences]
    const workData = { ...workForm }

    if (editingWorkIndex === -1) {
      newWorks.push(workData)
    } else {
      newWorks[editingWorkIndex] = workData
    }

    const payload: any = { workExperiences: newWorks }
    if (currentLang === 'Chinese') {
      // 一并同步到英文版
      payload._en_sync = { workExperiences: newWorks }
    }

    const success = await this.saveResumeProfile(payload, false)
    if (success) {
      ui.showSuccess(this.data.ui.saveSuccess)
      this.closeWorkDrawer()
    }
  },
  async onDeleteWorkExperience() {
    const { editingWorkIndex, workExperiences } = this.data
    if (editingWorkIndex === -1) return

    wx.showModal({
      title: '删除确认',
      content: '确定要删除这段工作经历吗？',
      success: async (res) => {
        if (res.confirm) {
          const newWorks = [...workExperiences]
          newWorks.splice(editingWorkIndex, 1)
          
          const payload: any = { workExperiences: newWorks }
          if (this.data.currentLang === 'Chinese') {
            payload._en_sync = { workExperiences: newWorks }
          }
          
          const success = await this.saveResumeProfile(payload, false)
          if (success) {
            ui.showSuccess(this.data.ui.saveSuccess)
            this.closeWorkDrawer()
          }
        }
      }
    })
  },

  async onSaveEducation() {
    const { eduForm, editingEduIndex, educations, ui: uiStrings, currentLang, en } = this.data
    
    // 全字段校验
    if (!eduForm.school.trim()) {
      wx.showToast({ title: uiStrings.schoolPlaceholder || '请输入学校', icon: 'none' })
      return
    }
    if (!eduForm.degree) {
      wx.showToast({ title: uiStrings.degreePlaceholder || '请选择学历', icon: 'none' })
      return
    }
    if (!eduForm.major.trim()) {
      wx.showToast({ title: uiStrings.majorPlaceholder || '请输入专业', icon: 'none' })
      return
    }
    if (!eduForm.startDate) {
      wx.showToast({ title: '请选择开始时间', icon: 'none' })
      return
    }
    if (!eduForm.endDate) {
      wx.showToast({ title: '请选择结束时间', icon: 'none' })
      return
    }

    // 时间逻辑校验
    if (eduForm.startDate && eduForm.endDate && eduForm.startDate !== uiStrings.toPresent && eduForm.endDate !== uiStrings.toPresent) {
      if (eduForm.startDate > eduForm.endDate) {
        wx.showToast({ title: '开始时间不能晚于结束时间', icon: 'none' })
        return
      }
    }

    const newEducations = [...educations]
    const eduData = { ...eduForm }
    
    // 准备更新的对象
    const updatePayload: any = {}

    if (currentLang === 'Chinese') {
        // 如果是中文模式，正常更新中文列表
        const finalEdu = { ...eduData }
        
        if (editingEduIndex === -1) {
          newEducations.push(finalEdu)
        } else {
          newEducations[editingEduIndex] = finalEdu
        }
        updatePayload.educations = newEducations

        // 同步逻辑：如果有英文选项，同步到英文简历
        // 只有当有明确的英文名称（来自建议）时才同步，或者第一次创建时顺带同步基础结构
        if (eduForm.school_en || eduForm.major_en || editingEduIndex === -1) {
          const newEnEducations = [...(en.educations || [])]
          const enEduEntry = {
            ...(editingEduIndex !== -1 && newEnEducations[editingEduIndex] ? newEnEducations[editingEduIndex] : {}),
            school: eduForm.school_en || eduForm.school, // 优先用英文名，没有则用当前输入的
            major: eduForm.major_en || eduForm.major,
            degree: eduForm.degree,
            startDate: eduForm.startDate,
            endDate: eduForm.endDate,
            description: eduForm.description,
            country_chinese: eduForm.country_chinese,
            country_english: eduForm.country_english
          }

          if (editingEduIndex === -1) {
            newEnEducations.push(enEduEntry)
          } else {
            newEnEducations[editingEduIndex] = enEduEntry
          }
          updatePayload._en_sync = { educations: newEnEducations }
        }
    } else {
        // 英文模式：仅更新英文列表，绝不影响中文
        if (editingEduIndex === -1) {
          newEducations.push(eduData)
        } else {
          newEducations[editingEduIndex] = eduData
        }
        updatePayload.educations = newEducations
    }

    const success = await this.saveResumeProfile(updatePayload, false)
    if (success) {
      ui.showSuccess(this.data.ui.saveSuccess)
      this.closeEduDrawer()
    }
  },

  // 技能相关逻辑
  onEditSkills() {
    this.setData({
      showSkillsDrawer: true,
      skillsForm: this.data.skills.length > 0 ? [...this.data.skills] : ['']
    })
  },
  
  onSkillInput(e: any) {
    const index = e.currentTarget.dataset.index
    const value = e.detail.value
    const skillsForm = [...this.data.skillsForm]
    skillsForm[index] = value
    this.setData({ skillsForm })
  },

  addSkillRow() {
    this.setData({
      skillsForm: [...this.data.skillsForm, '']
    })
  },

  removeSkillRow(e: any) {
    const index = e.currentTarget.dataset.index
    const skillsForm = [...this.data.skillsForm]
    skillsForm.splice(index, 1)
    // 保持至少一行
    if (skillsForm.length === 0) skillsForm.push('')
    this.setData({ skillsForm })
  },

  closeSkillsDrawer() {
    this.setData({ showSkillsDrawer: false })
  },

  async onSaveSkills() {
    const { skillsForm, currentLang } = this.data
    // 过滤掉空项
    const newSkills = skillsForm.map(s => s.trim()).filter(s => s !== '')
    
    const payload: any = { skills: newSkills }
    if (currentLang === 'Chinese') {
      payload._en_sync = { skills: newSkills }
    }
    
    const success = await this.saveResumeProfile(payload, false)
    if (success) {
      ui.showSuccess(this.data.ui.saveSuccess)
      this.closeSkillsDrawer()
    }
  },

  async onDeleteEducation() {
    const { editingEduIndex, educations } = this.data
    if (editingEduIndex === -1) return

    wx.showModal({
      title: '删除确认',
      content: '确定要删除这段教育经历吗？',
      success: async (res) => {
        if (res.confirm) {
          const newEducations = [...educations]
          newEducations.splice(editingEduIndex, 1)
          
          const payload: any = { educations: newEducations }
          if (this.data.currentLang === 'Chinese') {
            payload._en_sync = { educations: newEducations }
          }
          
          const success = await this.saveResumeProfile(payload, false)
          if (success) {
            ui.showSuccess(this.data.ui.saveSuccess)
            this.closeEduDrawer()
          }
        }
      }
    })
  },
  
  // 证书相关逻辑
  onEditCertificates() {
    this.setData({
      showCertificatesDrawer: true,
      certificatesForm: this.data.certificates.length > 0 ? [...this.data.certificates] : ['']
    })
  },

  onCertificateInput(e: any) {
    const index = e.currentTarget.dataset.index
    const value = e.detail.value
    const certificatesForm = [...this.data.certificatesForm]
    certificatesForm[index] = value
    this.setData({ certificatesForm })
  },

  addCertificateRow() {
    this.setData({
      certificatesForm: [...this.data.certificatesForm, '']
    })
  },

  removeCertificateRow(e: any) {
    const index = e.currentTarget.dataset.index
    const certificatesForm = [...this.data.certificatesForm]
    certificatesForm.splice(index, 1)
    // 保持至少一行
    if (certificatesForm.length === 0) certificatesForm.push('')
    this.setData({ certificatesForm })
  },

  closeCertificatesDrawer() {
    this.setData({ showCertificatesDrawer: false })
  },

  async onSaveCertificates() {
    const { certificatesForm, currentLang } = this.data
    // 过滤掉空项
    const newCertificates = certificatesForm.map(c => c.trim()).filter(c => c !== '')
    
    const payload: any = { certificates: newCertificates }
    if (currentLang === 'Chinese') {
      payload._en_sync = { certificates: newCertificates }
    }
    
    const success = await this.saveResumeProfile(payload, false)
    if (success) {
      ui.showSuccess(this.data.ui.saveSuccess)
      this.closeCertificatesDrawer()
    }
  },

  onEditAiMessage() {
    this.setData({
      showAiMessageSheet: true,
      aiMessageForm: this.data.aiMessage
    })
  },

  closeAiMessageSheet() {
    this.setData({ showAiMessageSheet: false })
  },

  onAiMessageInput(e: any) {
    this.setData({ aiMessageForm: e.detail.value })
  },

  async onSaveAiMessageSheet() {
    const payload: any = { aiMessage: this.data.aiMessageForm || '' }
    const success = await this.saveResumeProfile(payload, false)
    if (success) {
      ui.showSuccess(this.data.ui.saveSuccess)
      this.closeAiMessageSheet()
    }
  },
})

