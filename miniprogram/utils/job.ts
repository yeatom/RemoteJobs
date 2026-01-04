// miniprogram/utils/job.ts
import type { AppLanguage } from './i18n'

export type JobItem = {
  _id: string
  createdAt: string
  source_url: string
  salary: string
  source_name: string
  summary: string
  description?: string
  team: string
  title: string
  type: string
  tags: string[]
  displayTags?: string[]
  isSaved?: boolean // 是否为当前用户收藏（由云端函数返回）
}

export type ResolvedSavedJob = JobItem & {
  sourceCollection: string
}

export function normalizeJobTags<T extends { summary?: string; source_name?: string }>(
  item: T,
  language?: AppLanguage | string
): {
  tags: string[]
  displayTags: string[]
} {
  const tags = (item.summary || '')
    .split(/[,，]/)
    .map((t) => t.trim().replace(/[。！!.,，、；;]+$/g, '').trim())
    .filter((t) => t && t.length > 1)

  const displayTags = [...tags]
  // AIEnglish 时不插入 source_name 到 tags
  if (language !== 'AIEnglish' && item.source_name && typeof item.source_name === 'string' && item.source_name.trim()) {
    const sourceTag = item.source_name.trim()
    displayTags.push(sourceTag)
  }

  return { tags, displayTags }
}

export function mapJobs<T extends Record<string, any>>(
  jobs: T[],
  language?: AppLanguage | string
): (T & { tags: string[]; displayTags: string[] })[] {
  return (jobs || []).map((job) => {
    const { tags, displayTags } = normalizeJobTags(job, language)
    return {
      ...job,
      tags,
      displayTags,
    }
  })
}

/**
 * 根据用户语言设置，返回对应的数据库字段名
 * @param userLanguage 用户语言设置：'Chinese'（默认）、'AIChinese'（AI翻译全中文）、'AIEnglish'（AI翻译全英文）
 * @returns 包含 titleField, summaryField, descriptionField, salaryField, sourceNameField 的对象
 */
export function getJobFieldsByLanguage(userLanguage: AppLanguage | string): {
  titleField: string
  summaryField: string
  descriptionField: string
  salaryField: string
  sourceNameField: string
} {
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
 * @param jobData 原始岗位数据（可能包含 title_chinese, title_english 等字段）
 * @param titleField 查询时使用的 title 字段名
 * @param summaryField 查询时使用的 summary 字段名
 * @param descriptionField 查询时使用的 description 字段名
 * @param salaryField 查询时使用的 salary 字段名
 * @param sourceNameField 查询时使用的 source_name 字段名
 * @returns 映射后的岗位数据，统一使用 title, summary, description, salary, source_name
 */
export function mapJobFieldsToStandard(
  jobData: any,
  titleField: string,
  summaryField: string,
  descriptionField: string,
  salaryField?: string,
  sourceNameField?: string
): any {
  if (!jobData) return jobData
  
  // 统一将查询的字段映射回标准字段名
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
