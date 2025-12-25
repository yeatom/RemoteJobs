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
}

export type ResolvedFavoriteJob = JobItem & {
  jobId: string
  sourceCollection: string
}

// Single mapping used for both:
// 1) currentFilter -> collection
// 2) collected_jobs.type -> collection
export const typeCollectionMap: Record<string, string> = {
  国内: 'domestic_remote_jobs',
  国外: 'abroad_remote_jobs',
  web3: 'web3_remote_jobs',
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

