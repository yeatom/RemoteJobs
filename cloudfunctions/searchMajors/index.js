const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 检索专业列表，并按照匹配位置排序
 */
exports.main = async (event, context) => {
  const { keyword, level } = event
  
  if (!keyword || keyword.length < 2) {
    return { data: [] }
  }

  try {
    const res = await db.collection('majors').where(
      _.and([
        { level: db.RegExp({ regexp: level, options: 'i' }) },
        _.or([
          { chinese_name: db.RegExp({ regexp: keyword, options: 'i' }) },
          { english_name: db.RegExp({ regexp: keyword, options: 'i' }) }
        ])
      ])
    ).limit(100).get()

    let items = res.data
    const kw = keyword.toLowerCase().trim()

    items.sort((a, b) => {
      const aTitle = (a.chinese_name || '').trim()
      const bTitle = (b.chinese_name || '').trim()
      const aEng = (a.english_name || '').trim().toLowerCase()
      const bEng = (b.english_name || '').trim().toLowerCase()
      
      const aExact = aTitle === keyword || aEng === kw
      const bExact = bTitle === keyword || bEng === kw
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1

      const aStarts = aTitle.startsWith(keyword) || aEng.startsWith(kw)
      const bStarts = bTitle.startsWith(keyword) || bEng.startsWith(kw)

      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      
      const aPos = Math.min(
        aTitle.indexOf(keyword) === -1 ? Infinity : aTitle.indexOf(keyword),
        aEng.indexOf(kw) === -1 ? Infinity : aEng.indexOf(kw)
      )
      const bPos = Math.min(
        bTitle.indexOf(keyword) === -1 ? Infinity : bTitle.indexOf(keyword),
        bEng.indexOf(kw) === -1 ? Infinity : bEng.indexOf(kw)
      )
      
      if (aPos !== bPos) return aPos - bPos
      return aTitle.length - bTitle.length
    })

    return {
      data: items.slice(0, 10)
    }
  } catch (e) {
    console.error(e)
    return { data: [], error: e }
  }
}
