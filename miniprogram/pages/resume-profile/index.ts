// miniprogram/pages/resume-profile/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'
import { ui } from '../../utils/ui'
import { buildPageUI } from './ui.config'

Page({
  data: {
    // 个人信息
    name: '',
    name_en: '', // English Name
    photo: '',
    gender: '',
    birthday: '',
    identity: '',
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
    // 教育经历（可以有多个）
    educations: [] as Array<{ 
      school: string; 
      school_en?: string;
      school_cn?: string;
      country?: string;
      country_en?: string;
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
    showIdentityPicker: false,
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
      school_cn: '',
      country: '',
      country_en: '',
      degree: '',
      major: '',
      major_en: '',
      major_cn: '',
      startDate: '',
      endDate: '',
      description: '',
    },
    workForm: {
      company: '',
      jobTitle: '',
      businessDirection: '',
      startDate: '',
      endDate: '',
    },
    basicInfoForm: {
      name: '',
      gender: '',
      birthday: '',
      identity: '',
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
    identityOptions: [] as string[],
    
    // UI 文本
    ui: {} as Record<string, any>,
    completeness_cn: 0,
    completeness_en: 0,
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
    })
  },

  updateLanguage() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    
    const uiStrings = buildPageUI(lang, this.data)

    const degreeOptions = t<string[]>('resume.degreeOptions', lang)
    const studyTypes = t<string[]>('resume.studyTypes', lang)
    const genderOptions = t<string[]>('resume.genderOptions', lang)
    const identityOptions = t<string[]>('resume.identityOptions', lang)

    this.setData({ 
      ui: uiStrings, 
      degreeOptions, 
      studyTypes, 
      genderOptions, 
      identityOptions, 
      interfaceLang: lang 
    })
  },

  updateTips() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)

    this.setData({
      ['ui.tips']: buildPageUI(lang, this.data).tips
    })
  },

  loadResumeData() {
    const app = getApp<IAppOption>() as any
    const user = app?.globalData?.user

    if (user) {
      // 核心改动：使用新的 resume_profile 字段
      const profile = user.resume_profile || {}
      
      const name = profile.name || ''
      const name_en = profile.name_en || ''
      const photo = profile.photo || ''
      const gender = profile.gender || ''
      const birthday = profile.birthday || ''
      const identity = profile.identity || ''
      const location = profile.location || ''
      const wechat = profile.wechat || ''
      const email = profile.email || ''
      const phone = profile.phone || ''
      const phone_en = profile.phone_en || ''
      const personal_website = profile.personal_website || ''
      const whatsapp = profile.whatsapp || ''
      const telegram = profile.telegram || ''
      const linkedin = profile.linkedin || ''
      const educations = profile.educations || []
      const certificates = profile.certificates || []
      const workExperiences = profile.workExperiences || []
      
      const uiStrings = this.data.ui || {}
      const aiMessage = profile.aiMessage !== undefined ? profile.aiMessage : uiStrings.aiMessageDefault || ''

      // 计算完整度 (各自计算各自 shared 的基础信息)
      const isSharedBasicComplete = !!(photo && gender && birthday && identity)
      const isEducationComplete = educations.length > 0
      const isCertificatesComplete = certificates.length > 0

      // 中文版逻辑：要有姓名，联系方式(微信/电话/邮箱任一)，教育经历
      const isBasicCompleteCn = !!(name && isSharedBasicComplete)
      const isContactCompleteCn = !!(wechat || phone || email)
      let completeness_cn = 0
      if (isBasicCompleteCn && isContactCompleteCn && isEducationComplete) {
        completeness_cn = isCertificatesComplete ? 2 : 1
      }

      // 英文版逻辑：要有英文名、所在地，联系方式(邮箱/领英/英文手机任一)，教育经历
      const isBasicCompleteEn = !!(name_en && location && isSharedBasicComplete)
      const isContactCompleteEn = !!(email || linkedin || phone_en)
      let completeness_en = 0
      if (isBasicCompleteEn && isContactCompleteEn && isEducationComplete) {
        completeness_en = isCertificatesComplete ? 2 : 1
      }

      this.setData({
        name,
        name_en,
        photo,
        gender,
        birthday,
        identity,
        location,
        wechat,
        email,
        phone,
        phone_en,
        personal_website,
        whatsapp,
        telegram,
        linkedin,
        educations,
        certificates,
        skills: profile.skills || [],
        workExperiences,
        aiMessage,
        completeness_cn,
        completeness_en
      }, () => {
        this.updateTips()
      })
    }
  },

  async saveResumeProfile(data: any) {
    const { ui: uiStrings } = this.data
    try {
      ui.showLoading(uiStrings.saving)

      // 合并现有数据计算新的完整度
      const app = getApp<IAppOption>() as any
      const user = app.globalData.user || {}
      const currentProfile = user.resume_profile || {}
      const newProfile = { ...currentProfile, ...data }
      
      const isSharedBasicComplete = !!(newProfile.photo && newProfile.gender && newProfile.birthday && newProfile.identity)
      const isEducationComplete = newProfile.educations?.length > 0
      const isCertificatesComplete = newProfile.certificates?.length > 0

      // 中文版逻辑
      const isBasicCompleteCn = !!(newProfile.name && isSharedBasicComplete)
      const isContactCompleteCn = !!(newProfile.wechat || newProfile.phone || newProfile.email)
      let completeness_cn = 0
      if (isBasicCompleteCn && isContactCompleteCn && isEducationComplete) {
        completeness_cn = isCertificatesComplete ? 2 : 1
      }

      // 英文版逻辑
      const isBasicCompleteEn = !!(newProfile.name_en && newProfile.location && isSharedBasicComplete)
      const isContactCompleteEn = !!(newProfile.email || newProfile.linkedin || newProfile.phone_en)
      let completeness_en = 0
      if (isBasicCompleteEn && isContactCompleteEn && isEducationComplete) {
        completeness_en = isCertificatesComplete ? 2 : 1
      }

      const res: any = await wx.cloud.callFunction({
        name: 'updateUserProfile',
        data: { 
          resume_profile: data,
          resume_completeness: completeness_cn,
          resume_completeness_en: completeness_en
        }
      })
      
      if (res.result?.ok) {
        const app = getApp<IAppOption>() as any
        app.globalData.user = res.result.user
        this.loadResumeData()
        ui.hideLoading()
        ui.showSuccess(uiStrings.saveSuccess)
      } else {
        throw new Error('保存失败')
      }
    } catch (err) {
      console.error(err)
      ui.hideLoading()
      ui.showError(uiStrings.saveFailed)
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
          const cloudPath = `resume_photos/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePath,
          })
          await this.saveResumeProfile({ photo: uploadRes.fileID })
        } catch (e) {
          wx.showToast({ title: uiStrings.uploadFailed, icon: 'none' })
        } finally {
          wx.hideLoading()
        }
      }
    })
  },
  
  // 个人基本信息相关逻辑
  onEditBasicInfo() {
    // Determine which name to show in the form
    const currentName = this.data.currentLang === 'English' ? this.data.name_en : this.data.name
    
    this.setData({
      showBasicInfoDrawer: true,
      basicInfoForm: {
        name: currentName,
        gender: this.data.gender,
        birthday: this.data.birthday,
        identity: this.data.identity,
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
    const { contactInfoForm } = this.data
    await this.saveResumeProfile({
      wechat: contactInfoForm.wechat,
      email: contactInfoForm.email,
      phone: contactInfoForm.phone,
      phone_en: contactInfoForm.phone_en,
      whatsapp: contactInfoForm.whatsapp,
      telegram: contactInfoForm.telegram,
      linkedin: contactInfoForm.linkedin,
      personal_website: contactInfoForm.personal_website,
    })
    this.closeContactInfoDrawer()
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
  openIdentityPicker() {
    this.setData({ showIdentityPicker: true })
  },
  closeIdentityPicker() {
    this.setData({ showIdentityPicker: false })
  },
  onSelectIdentity(e: any) {
    this.setData({ 
      'basicInfoForm.identity': e.currentTarget.dataset.value,
      showIdentityPicker: false
    })
  },
  async onSaveBasicInfo() {
    const { basicInfoForm, ui, currentLang } = this.data
    const isEnglish = currentLang === 'English'

    if (!basicInfoForm.name.trim()) {
      wx.showToast({ title: ui.namePlaceholder, icon: 'none' })
      return
    }

    const dataToUpdate: any = {
      gender: basicInfoForm.gender,
      birthday: basicInfoForm.birthday,
      identity: basicInfoForm.identity,
      location: basicInfoForm.location,
    }

    if (isEnglish) {
      dataToUpdate.name_en = basicInfoForm.name
    } else {
      dataToUpdate.name = basicInfoForm.name
    }

    await this.saveResumeProfile(dataToUpdate)
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
        school_cn: '',
        country: '',
        country_en: '',
        degree: '',
        major: '',
        major_en: '',
        major_cn: '',
        startDate: '',
        endDate: '',
        description: '',
      }
    })
  },
  onEditEducation(e: any) {
    const index = e.currentTarget.dataset.index
    const edu = this.data.educations[index]
    const isEnglish = this.data.currentLang === 'English'
    
    // Determine displayed school name (no fallback for inputs)
    let displayedSchool = isEnglish ? (edu.school_en || '') : (edu.school || '')

    // Determine displayed major name (no fallback for inputs)
    let displayedMajor = isEnglish ? (edu.major_en || '') : (edu.major || '')

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
        school_cn: edu.school || '',
        country: edu.country || '',
        country_en: edu.country_en || '',
        degree: edu.degree || '',
        major: displayedMajor,
        major_en: edu.major_en || '',
        major_cn: edu.major || '',
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
    const [dIdx, tIdx] = this.data.degreePickerValue
    const degree = this.data.degreeOptions[dIdx]
    const type = this.data.studyTypes[tIdx]
    const degreeStr = `${degree} (${type})`
    
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
    const db = wx.cloud.database()
    const _ = db.command
    try {
      const res = await db.collection('universities').where(
        _.or([
          { chinese_name: db.RegExp({ regexp: keyword, options: 'i' }) },
          { english_name: db.RegExp({ regexp: keyword, options: 'i' }) }
        ])
      ).limit(5).get()
      
      this.setData({
        universitySuggestions: res.data as any,
        showUniversitySuggestions: res.data.length > 0
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
      'eduForm.school_cn': item.chinese_name || '',
      'eduForm.country': item.country || '',
      'eduForm.country_en': item.country_en || item.country || '',
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
    // 延迟关闭，确保点击建议项的事件能先触发
    setTimeout(() => {
      this.setData({ showUniversitySuggestions: false })
    }, 200)
  },

  onEduSchoolInput(e: any) {
    const keyword = e.detail.value
    this.setData({ 
      'eduForm.school': keyword,
      'eduForm.country': '',
      'eduForm.country_en': '',
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

    const db = wx.cloud.database()
    const _ = db.command
    try {
      const res = await db.collection('majors').where(
        _.and([
          { level: db.RegExp({ regexp: levelQuery, options: 'i' }) },
          _.or([
            { chinese_name: db.RegExp({ regexp: keyword, options: 'i' }) },
            { english_name: db.RegExp({ regexp: keyword, options: 'i' }) }
          ])
        ])
      ).limit(5).get()
      
      this.setData({
        majorSuggestions: res.data as any,
        showMajorSuggestions: res.data.length > 0
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
      'eduForm.major_cn': item.chinese_name || '',
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
  async onSaveWorkExperience() {
    const { workForm, editingWorkIndex, workExperiences, ui } = this.data
    
    if (!workForm.company.trim()) {
      wx.showToast({ title: ui.companyPlaceholder || '请输入公司名称', icon: 'none' })
      return
    }
    if (!workForm.jobTitle.trim()) {
      wx.showToast({ title: ui.jobTitlePlaceholder || '请输入职位名称', icon: 'none' })
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

    if (workForm.startDate && workForm.endDate && workForm.startDate !== ui.toPresent && workForm.endDate !== ui.toPresent) {
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

    await this.saveResumeProfile({ workExperiences: newWorks })
    this.closeWorkDrawer()
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
          await this.saveResumeProfile({ workExperiences: newWorks })
          this.closeWorkDrawer()
        }
      }
    })
  },

  async onSaveEducation() {
    const { eduForm, editingEduIndex, educations, ui, currentLang } = this.data
    
    // 全字段校验
    if (!eduForm.school.trim()) {
      wx.showToast({ title: ui.schoolPlaceholder || '请输入学校', icon: 'none' })
      return
    }
    if (!eduForm.degree) {
      wx.showToast({ title: ui.degreePlaceholder || '请选择学历', icon: 'none' })
      return
    }
    if (!eduForm.major.trim()) {
      wx.showToast({ title: ui.majorPlaceholder || '请输入专业', icon: 'none' })
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
    if (eduForm.startDate && eduForm.endDate && eduForm.startDate !== ui.toPresent && eduForm.endDate !== ui.toPresent) {
      if (eduForm.startDate > eduForm.endDate) {
        wx.showToast({ title: '开始时间不能晚于结束时间', icon: 'none' })
        return
      }
    }

    const newEducations = [...educations]
    const eduData = { ...eduForm }
    
    // Handle Bilingual Names with manual entry logic
    if (currentLang === 'English') {
        eduData.school_en = eduForm.school
        eduData.country = eduForm.country
        eduData.country_en = eduForm.country_en
        // Only trust the counterpart if the primary field matches our recorded DB source
        if (eduForm.school === eduForm.school_en && eduForm.school_cn) {
            eduData.school = eduForm.school_cn
        }
        // Note: For English tab, we don't clear the Chinese 'school' if it's manual, 
        // because we usually want to preserve at least one name.
        
        eduData.major_en = eduForm.major
        if (eduForm.major === eduForm.major_en && eduForm.major_cn) {
            eduData.major = eduForm.major_cn
        }
    } else {
        eduData.school = eduForm.school
        eduData.country = eduForm.country
        eduData.country_en = eduForm.country_en
        if (eduForm.school === eduForm.school_cn && eduForm.school_en) {
            eduData.school_en = eduForm.school_en
        } else {
            // Manual/Changed entry in Chinese -> English side should be empty
            eduData.school_en = ''
        }
        
        eduData.major = eduForm.major
        if (eduForm.major === eduForm.major_cn && eduForm.major_en) {
            eduData.major_en = eduForm.major_en
        } else {
            // Manual/Changed entry in Chinese -> English side should be empty
            eduData.major_en = ''
        }
    }
    
    // Clean up temporary fields
    delete (eduData as any).school_cn
    delete (eduData as any).major_cn

    if (editingEduIndex === -1) {
      newEducations.push(eduData)
    } else {
      newEducations[editingEduIndex] = eduData
    }

    await this.saveResumeProfile({ educations: newEducations })
    this.closeEduDrawer()
  },

  // 技能相关逻辑
  onAddSkill() {
    wx.showModal({
      title: this.data.ui.addSkill,
      placeholderText: this.data.ui.skillPlaceholder,
      editable: true,
      success: async (res) => {
        if (res.confirm && res.content.trim()) {
          const newSkills = [...this.data.skills, res.content.trim()]
          await this.saveResumeProfile({ skills: newSkills })
        }
      }
    })
  },
  onEditSkill(e: any) {
    const index = e.currentTarget.dataset.index
    const currentSkill = this.data.skills[index]
    wx.showModal({
      title: '编辑技能',
      editable: true,
      content: currentSkill,
      success: async (res) => {
        if (res.confirm && res.content.trim()) {
          const newSkills = [...this.data.skills]
          newSkills[index] = res.content.trim()
          await this.saveResumeProfile({ skills: newSkills })
        }
      }
    })
  },
  onDeleteSkill(e: any) {
    const index = e.currentTarget.dataset.index
    wx.showModal({
      title: '确认删除',
      content: `确定要删除“${this.data.skills[index]}”吗？`,
      success: async (res) => {
        if (res.confirm) {
          const newSkills = [...this.data.skills]
          newSkills.splice(index, 1)
          await this.saveResumeProfile({ skills: newSkills })
        }
      }
    })
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
          await this.saveResumeProfile({ educations: newEducations })
          this.closeEduDrawer()
        }
      }
    })
  },
  
  onAddCertificate() {
    wx.showModal({
      title: '添加证书',
      placeholderText: '请输入证书名称，如：CET-6',
      editable: true,
      success: async (res) => {
        if (res.confirm && res.content.trim()) {
          const newCertificates = [...this.data.certificates, res.content.trim()]
          await this.saveResumeProfile({ certificates: newCertificates })
        }
      }
    })
  },
  onEditCertificate(e: any) {
    const index = e.currentTarget.dataset.index
    const currentCert = this.data.certificates[index]
    wx.showModal({
      title: '编辑证书',
      editable: true,
      content: currentCert,
      success: async (res) => {
        if (res.confirm && res.content.trim()) {
          const newCertificates = [...this.data.certificates]
          newCertificates[index] = res.content.trim()
          await this.saveResumeProfile({ certificates: newCertificates })
        }
      }
    })
  },
  onDeleteCertificate(e: any) {
    const index = e.currentTarget.dataset.index
    wx.showModal({
      title: '确认删除',
      content: `确定要删除“${this.data.certificates[index]}”吗？`,
      success: async (res) => {
        if (res.confirm) {
          const newCertificates = [...this.data.certificates]
          newCertificates.splice(index, 1)
          await this.saveResumeProfile({ certificates: newCertificates })
        }
      }
    })
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
    await this.saveResumeProfile({ aiMessage: this.data.aiMessageForm || '' })
    this.closeAiMessageSheet()
  },
})

