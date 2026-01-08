// miniprogram/pages/resume-profile/index.ts
import { normalizeLanguage, t } from '../../utils/i18n'
import { attachLanguageAware } from '../../utils/languageAware'

Page({
  data: {
    // 个人信息
    name: '',
    photo: '',
    gender: '',
    birthday: '',
    identity: '',
    wechat: '',
    email: '',
    phone: '',
    // 教育经历（可以有多个）
    educations: [] as Array<{ 
      school: string; 
      degree: string; 
      major: string; 
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
    eduForm: {
      school: '',
      degree: '',
      major: '',
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
    },
    degreeOptions: [] as string[],
    genderOptions: [] as string[],
    identityOptions: [] as string[],
    
    // UI 文本
    ui: {} as Record<string, any>,
    completeness: 0, // 0: incomplete, 1: complete (except certs), 2: perfect (with certs)
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

  updateLanguage() {
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)
    
    const ui = {
      title: t('resume.title', lang),
      tips: t('resume.tips', lang),
      personalInfo: t('resume.personalInfo', lang),
      contactInfo: t('resume.contactInfo', lang),
      name: t('resume.name', lang),
      photo: t('resume.photo', lang),
      gender: t('resume.gender', lang),
      birthday: t('resume.birthday', lang),
      identity: t('resume.identity', lang),
      wechat: t('resume.wechat', lang),
      email: t('resume.email', lang),
      phone: t('resume.phone', lang),
      education: t('resume.education', lang),
      certificates: t('resume.certificates', lang),
      degree: t('resume.degree', lang),
      major: t('resume.major', lang),
      startDate: t('resume.startDate', lang),
      endDate: t('resume.endDate', lang),
      graduationDate: t('resume.graduationDate', lang),
      timePeriod: t('resume.timePeriod', lang),
      schoolPlaceholder: t('resume.schoolPlaceholder', lang),
      majorPlaceholder: t('resume.majorPlaceholder', lang),
      degreePlaceholder: t('resume.degreePlaceholder', lang),
      genderPlaceholder: t('resume.genderPlaceholder', lang),
      identityPlaceholder: t('resume.identityPlaceholder', lang),
      birthdayPlaceholder: t('resume.birthdayPlaceholder', lang),
      namePlaceholder: t('resume.namePlaceholder', lang),
      description: t('resume.description', lang),
      descriptionPlaceholder: t('resume.descriptionPlaceholder', lang),
      optional: t('resume.optional', lang),
      addEducation: t('resume.addEducation', lang),
      addCertificate: t('resume.addCertificate', lang),
      noData: t('resume.noData', lang),
      save: t('resume.save', lang),
      cancel: t('resume.cancel', lang),
      delete: t('resume.delete', lang),
      toPresent: t('resume.toPresent', lang),
      workExperience: t('resume.workExperience', lang),
      aiMessageLabel: t('resume.aiMessageLabel', lang),
      aiMessageDefault: t('resume.aiMessageDefault', lang),
      company: t('resume.company', lang),
      companyPlaceholder: t('resume.companyPlaceholder', lang),
      jobTitle: t('resume.jobTitle', lang),
      jobTitlePlaceholder: t('resume.jobTitlePlaceholder', lang),
      businessDirection: t('resume.businessDirection', lang),
      businessDirectionPlaceholder: t('resume.businessDirectionPlaceholder', lang),
      addWorkExperience: t('resume.addWorkExperience', lang),
    }

    const degreeOptions = t<string[]>('resume.degreeOptions', lang)
    const studyTypes = t<string[]>('resume.studyTypes', lang)
    const genderOptions = t<string[]>('resume.genderOptions', lang)
    const identityOptions = t<string[]>('resume.identityOptions', lang)

    this.setData({ ui, degreeOptions, studyTypes, genderOptions, identityOptions }, () => {
      this.updateTips()
    })
  },

  updateTips() {
    const { completeness } = this.data
    const app = getApp<IAppOption>() as any
    const lang = normalizeLanguage(app?.globalData?.language)

    let tips = t('resume.tips', lang)
    if (completeness === 1) {
      tips = t('resume.tipsComplete', lang)
    } else if (completeness === 2) {
      tips = t('resume.tipsPerfect', lang)
    }

    this.setData({
      'ui.tips': tips
    })
  },

  loadResumeData() {
    const app = getApp<IAppOption>() as any
    const user = app?.globalData?.user

    if (user) {
      // 核心改动：使用新的 resume_profile 字段
      const profile = user.resume_profile || {}
      
      const name = profile.name || ''
      const photo = profile.photo || ''
      const gender = profile.gender || ''
      const birthday = profile.birthday || ''
      const identity = profile.identity || ''
      const wechat = profile.wechat || ''
      const email = profile.email || ''
      const phone = profile.phone || ''
      const educations = profile.educations || []
      const certificates = profile.certificates || []
      const workExperiences = profile.workExperiences || []
      const aiMessage = profile.aiMessage !== undefined ? profile.aiMessage : t('resume.aiMessageDefault', normalizeLanguage(app?.globalData?.language))

      // 计算完整度
      const isBasicComplete = !!(name && photo && gender && birthday && identity)
      const isContactComplete = !!(wechat || email || phone)
      const isEducationComplete = educations.length > 0
      const isCertificatesComplete = certificates.length > 0

      let completeness = 0
      if (isBasicComplete && isContactComplete && isEducationComplete) {
        completeness = isCertificatesComplete ? 2 : 1
      }

      this.setData({
        name,
        photo,
        gender,
        birthday,
        identity,
        wechat,
        email,
        phone,
        educations,
        certificates,
        workExperiences,
        aiMessage,
        completeness
      }, () => {
        this.updateTips()
      })
    }
  },

  async saveResumeProfile(data: any) {
    try {
      wx.showLoading({ title: '保存中...' })

      // 合并现有数据计算新的完整度
      const app = getApp<IAppOption>() as any
      const user = app.globalData.user || {}
      const currentProfile = user.resume_profile || {}
      const newProfile = { ...currentProfile, ...data }
      
      const isBasicComplete = !!(newProfile.name && newProfile.photo && newProfile.gender && newProfile.birthday && newProfile.identity)
      const isContactComplete = !!(newProfile.wechat || newProfile.email || newProfile.phone)
      const isEducationComplete = newProfile.educations?.length > 0
      const isCertificatesComplete = newProfile.certificates?.length > 0

      let completeness = 0
      if (isBasicComplete && isContactComplete && isEducationComplete) {
        completeness = isCertificatesComplete ? 2 : 1
      }

      const res: any = await wx.cloud.callFunction({
        name: 'updateUserProfile',
        data: { 
          resume_profile: data,
          resume_completeness: completeness
        }
      })
      
      if (res.result?.ok) {
        const app = getApp<IAppOption>() as any
        app.globalData.user = res.result.user
        this.loadResumeData()
        wx.showToast({ title: '保存成功', icon: 'success' })
      } else {
        throw new Error('保存失败')
      }
    } catch (err) {
      console.error(err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // UI Event Handlers
  onEditPhoto() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0]
        wx.showLoading({ title: '上传中...' })
        try {
          const cloudPath = `resume_photos/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePath,
          })
          await this.saveResumeProfile({ photo: uploadRes.fileID })
        } catch (e) {
          wx.showToast({ title: '上传失败', icon: 'none' })
        } finally {
          wx.hideLoading()
        }
      }
    })
  },
  onEditWechat() {
    wx.showModal({
      title: '编辑微信号',
      placeholderText: '请输入微信号',
      editable: true,
      content: this.data.wechat,
      success: (res) => {
        if (res.confirm && res.content) {
          this.saveResumeProfile({ wechat: res.content })
        }
      }
    })
  },
  onEditEmail() {
    wx.showModal({
      title: '编辑邮箱',
      placeholderText: '请输入联系邮箱',
      editable: true,
      content: this.data.email,
      success: (res) => {
        if (res.confirm && res.content) {
          this.saveResumeProfile({ email: res.content })
        }
      }
    })
  },
  onEditPhone() {
    wx.showModal({
      title: '编辑手机号',
      placeholderText: '请输入联系手机号',
      editable: true,
      content: this.data.phone,
      success: (res) => {
        if (res.confirm && res.content) {
          this.saveResumeProfile({ phone: res.content })
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
        identity: this.data.identity,
      }
    })
  },
  closeBasicInfoDrawer() {
    this.setData({ showBasicInfoDrawer: false })
  },
  onBasicNameInput(e: any) {
    this.setData({ 'basicInfoForm.name': e.detail.value })
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
    const { basicInfoForm, ui } = this.data
    if (!basicInfoForm.name.trim()) {
      wx.showToast({ title: ui.namePlaceholder, icon: 'none' })
      return
    }
    await this.saveResumeProfile({
      name: basicInfoForm.name,
      gender: basicInfoForm.gender,
      birthday: basicInfoForm.birthday,
      identity: basicInfoForm.identity,
    })
    this.closeBasicInfoDrawer()
  },

  // 教育经历相关逻辑
  onAddEducation() {
    this.setData({
      showEduDrawer: true,
      editingEduIndex: -1,
      eduForm: {
        school: '',
        degree: '',
        major: '',
        startDate: '',
        endDate: '',
        description: '',
      }
    })
  },
  onEditEducation(e: any) {
    const index = e.currentTarget.dataset.index
    const edu = this.data.educations[index]
    this.setData({
      showEduDrawer: true,
      editingEduIndex: index,
      eduForm: {
        school: edu.school || '',
        degree: edu.degree || '',
        major: edu.major || '',
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

  onEduSchoolInput(e: any) {
    this.setData({ 'eduForm.school': e.detail.value })
  },
  onEduDegreeChange(e: any) {
    this.setData({ 'eduForm.degree': this.data.degreeOptions[e.detail.value] })
  },
  onEduMajorInput(e: any) {
    this.setData({ 'eduForm.major': e.detail.value })
  },
  onEduStartDateChange(e: any) {
    this.setData({ 'eduForm.startDate': e.detail.value })
  },
  onEduEndDateChange(e: any) {
    this.setData({ 'eduForm.endDate': e.detail.value })
  },
  onEduDescriptionInput(e: any) {
    this.setData({ 'eduForm.description': e.detail.value })
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
    const { eduForm, editingEduIndex, educations, ui } = this.data
    
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

    if (editingEduIndex === -1) {
      newEducations.push(eduData)
    } else {
      newEducations[editingEduIndex] = eduData
    }

    await this.saveResumeProfile({ educations: newEducations })
    this.closeEduDrawer()
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

