const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const typeCollectionMap = {
  国内: 'domestic_remote_jobs',
  国外: 'abroad_remote_jobs',
  web3: 'web3_remote_jobs',
}

exports.main = async (event, context) => {
  const { collectionName, pageSize = 15, skip = 0, collectionNames } = event || {}

  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    let jobs = []

    if (Array.isArray(collectionNames) && collectionNames.length > 0) {
      const allJobs = []
      
      for (const collName of collectionNames) {
        try {
          const res = await db
            .collection(collName)
            .orderBy('createdAt', 'desc')
            .skip(0)
            .limit(pageSize)
            .get()
          
          const mapped = (res.data || []).map(job => ({
            ...job,
            sourceCollection: collName,
          }))
          allJobs.push(...mapped)
        } catch (err) {
          // ignore
        }
      }
      
      allJobs.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime()
        const bTime = new Date(b.createdAt || 0).getTime()
        return bTime - aTime
      })
      
      jobs = allJobs.slice(0, pageSize)
    } else if (collectionName) {
      const res = await db
        .collection(collectionName)
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get()
      
      jobs = res.data || []
    } else {
      return {
        ok: false,
        error: 'missing collectionName or collectionNames',
      }
    }

    if (jobs.length > 0 && openid) {
      try {
        const jobIds = jobs.map(job => job._id).filter(Boolean)
        
        if (jobIds.length > 0) {
          const collectedRes = await db
            .collection('collected_jobs')
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
    return {
      ok: false,
      error: err.message || 'unknown error',
    }
  }
}

