// miniprogram/utils/job.ts

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

export function normalizeJobTags<T extends { summary?: string; source_name?: string }>(item: T): {
  tags: string[]
  displayTags: string[]
} {
  const tags = (item.summary || '')
    .split(/[,，]/)
    .map((t) => t.trim().replace(/[。！!.,，、；;]+$/g, '').trim())
    .filter((t) => t && t.length > 1)

  const displayTags = [...tags]
  if (item.source_name && typeof item.source_name === 'string' && item.source_name.trim()) {
    const sourceTag = item.source_name.trim()
    if (displayTags.length >= 1) {
      displayTags.splice(1, 0, sourceTag)
    } else {
      displayTags.push(sourceTag)
    }
  }

  return { tags, displayTags }
}

export function mapJobs<T extends Record<string, any>>(jobs: T[]): (T & { tags: string[]; displayTags: string[] })[] {
  return (jobs || []).map((job) => {
    const { tags, displayTags } = normalizeJobTags(job)
    return {
      ...job,
      tags,
      displayTags,
    }
  })
}
