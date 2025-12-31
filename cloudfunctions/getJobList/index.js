const cloud = require('wx-server-sdk')
const { matchSalary } = require('./salaryUtils')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 根据用户语言设置，返回对应的数据库字段名
 * @param {string} userLanguage 用户语言设置：'Chinese'（默认）、'AIChinese'（AI翻译全中文）、'AIEnglish'（AI翻译全英文）
 * @returns {Object} 包含 titleField, summaryField, descriptionField, salaryField, sourceNameField 的对象
 */
function getJobFieldsByLanguage(userLanguage) {
  // AIChinese: 使用 title_chinese, summary_chinese, description_chinese（AI翻译全中文）
  // AIEnglish: 使用 title_english, summary_english, description_english, salary_english, source_name_english（AI翻译全英文）
  // Chinese/English: 使用 title, summary, description, salary, source_name（原始字段）
  if (userLanguage === 'AIChinese') {
    return {
      titleField: 'title_chinese',
      summaryField: 'summary_chinese',
      descriptionField: 'description_chinese',
      salaryField: 'salary',
      sourceNameField: 'source_name',
    }
  } else if (userLanguage === 'AIEnglish') {
    return {
      titleField: 'title_english',
      summaryField: 'summary_english',
      descriptionField: 'description_english',
      salaryField: 'salary_english',
      sourceNameField: 'source_name_english',
    }
  } else {
    return {
      titleField: 'title',
      summaryField: 'summary',
      descriptionField: 'description',
      salaryField: 'salary',
      sourceNameField: 'source_name',
    }
  }
}

/**
 * 将查询结果中的多语言字段映射回标准字段名（title, summary, description, salary, source_name）
 * @param {Object} jobData 原始岗位数据（可能包含 title_chinese, title_english 等字段）
 * @param {string} titleField 查询时使用的 title 字段名
 * @param {string} summaryField 查询时使用的 summary 字段名
 * @param {string} descriptionField 查询时使用的 description 字段名
 * @param {string} salaryField 查询时使用的 salary 字段名（可选）
 * @param {string} sourceNameField 查询时使用的 source_name 字段名（可选）
 * @returns {Object} 映射后的岗位数据，统一使用 title, summary, description, salary, source_name
 */
function mapJobFieldsToStandard(jobData, titleField, summaryField, descriptionField, salaryField, sourceNameField) {
  if (!jobData) return jobData
  
  return {
    _id: jobData._id,
    createdAt: jobData.createdAt,
    source_url: jobData.source_url,
    salary: salaryField ? (jobData[salaryField] || jobData.salary || '') : (jobData.salary || ''),
    source_name: sourceNameField ? (jobData[sourceNameField] || jobData.source_name || '') : (jobData.source_name || ''),
    team: jobData.team,
    type: jobData.type,
    tags: jobData.tags,
    title: jobData[titleField] || '',
    summary: jobData[summaryField] || '',
    description: jobData[descriptionField] || '',
  }
}

exports.main = async (event, context) => {
  const { pageSize = 15, skip = 0, source_name, types, salary, language } = event || {}

  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 获取用户语言设置：优先使用传入的 language 参数，如果没有则从数据库读取
    let userLanguage = language || 'Chinese'
    if (!userLanguage && openid) {
      try {
        const userRes = await db.collection('users').doc(openid).get()
        if (userRes.data && userRes.data.language) {
          userLanguage = userRes.data.language
        }
      } catch (err) {
        // 如果获取用户信息失败，使用默认语言
      }
    }

    // 根据语言决定使用哪些字段
    const { titleField, summaryField, descriptionField, salaryField, sourceNameField } = getJobFieldsByLanguage(userLanguage)

    // 构建 where 条件
    const whereCondition = {}
    
    // 区域筛选（支持多选）
    if (Array.isArray(types) && types.length > 0) {
      whereCondition.type = db.command.in(types)
    }
    
    // 来源筛选（支持多选）
    if (Array.isArray(source_name) && source_name.length > 0) {
      if (source_name.length === 1) {
        whereCondition.source_name = source_name[0]
      } else {
        whereCondition.source_name = db.command.in(source_name)
      }
    }

    let query = db.collection('remote_jobs')
    
    // 应用筛选条件
    if (Object.keys(whereCondition).length > 0) {
      query = query.where(whereCondition)
    }
    
    // 根据语言选择字段，只查询需要的字段
    const fieldSelection = {
      _id: true,
      createdAt: true,
      source_url: true,
      team: true,
      type: true,
      tags: true,
      [titleField]: true,
      [summaryField]: true,
      [descriptionField]: true,
    }
    
    // 根据语言选择 salary 和 source_name 字段
    if (salaryField) {
      fieldSelection[salaryField] = true
      // 如果是 AIEnglish，也查询原始字段作为 fallback
      if (userLanguage === 'AIEnglish' && salaryField !== 'salary') {
        fieldSelection.salary = true
      }
    } else {
      fieldSelection.salary = true
    }
    
    if (sourceNameField) {
      fieldSelection[sourceNameField] = true
      // 如果是 AIEnglish，也查询原始字段作为 fallback
      if (userLanguage === 'AIEnglish' && sourceNameField !== 'source_name') {
        fieldSelection.source_name = true
      }
    } else {
      fieldSelection.source_name = true
    }
    
    query = query.field(fieldSelection)
    
    // 注意：薪资筛选需要在获取数据后进行，因为需要解析薪资字符串
    // 先获取所有符合其他条件的数据
    const res = await query
      .orderBy('createdAt', 'desc')
      .get()
    
    let jobs = res.data || []
    
    // 将查询的字段名映射回标准字段名（title, summary, description, salary, source_name）
    jobs = jobs.map(job => mapJobFieldsToStandard(job, titleField, summaryField, descriptionField, salaryField, sourceNameField))
    
    // 应用薪资筛选（如果指定了薪资条件）
    if (salary && salary !== '全部') {
      jobs = jobs.filter(job => {
        const jobSalary = job.salary || ''
        return matchSalary(jobSalary, salary)
      })
    }
    
    // 分页处理（在薪资筛选之后）
    const total = jobs.length
    jobs = jobs.slice(skip, skip + pageSize)

    if (jobs.length > 0 && openid) {
      try {
        const jobIds = jobs.map(job => job._id).filter(Boolean)
        
        if (jobIds.length > 0) {
          const collectedRes = await db
            .collection('saved_jobs')
            .where({
              openid,
              jobId: db.command.in(jobIds),
            })
            .get()
          
          const collectedSet = new Set((collectedRes.data || []).map(item => item.jobId))
          
          jobs = jobs.map(job => ({
            ...job,
            isSaved: collectedSet.has(job._id),
          }))
        }
      } catch (err) {
        jobs = jobs.map(job => ({
          ...job,
          isSaved: false,
        }))
      }
    } else {
      jobs = jobs.map(job => ({
        ...job,
        isSaved: false,
      }))
    }

    return {
      ok: true,
      jobs,
    }
  } catch (err) {
    console.error('getJobList error:', {
      error: err,
      message: err.message,
      stack: err.stack,
      event: event,
    })
    return {
      ok: false,
      error: err.message || 'unknown error',
      details: err.toString(),
    }
  }
}

