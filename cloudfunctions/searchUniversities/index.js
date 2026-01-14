const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 检索大学列表，并按照匹配位置排序
 * 优先显示以关键字开头的学校
 */
exports.main = async (event, context) => {
  const { keyword } = event
  
  if (!keyword || keyword.length < 2) {
    return { data: [] }
  }

  try {
    // 1. 从数据库获取更多候选结果 (增加 limit 到 100，确保覆盖核心名校)
    const res = await db.collection('universities').where(
      _.or([
        { chinese_name: db.RegExp({ regexp: keyword, options: 'i' }) },
        { english_name: db.RegExp({ regexp: keyword, options: 'i' }) }
      ])
    ).limit(100).get()

    let items = res.data
    const kw = keyword.toLowerCase().trim()

    // 2. 在 JS 中进行排序
    items.sort((a, b) => {
      const aTitle = (a.chinese_name || '').trim()
      const bTitle = (b.chinese_name || '').trim()
      const aEng = (a.english_name || '').trim().toLowerCase()
      const bEng = (b.english_name || '').trim().toLowerCase()
      
      // 优先级 1: 完全匹配 (Exact Match)
      const aExact = aTitle === keyword || aEng === kw
      const bExact = bTitle === keyword || bEng === kw
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1

      // 优先级 2: 以关键字开头 (Starts With)
      const aStarts = aTitle.startsWith(keyword) || aEng.startsWith(kw)
      const bStarts = bTitle.startsWith(keyword) || bEng.startsWith(kw)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      
      // 优先级 3: 关键字出现的位置 (Position)
      const aPos = Math.min(
        aTitle.indexOf(keyword) === -1 ? Infinity : aTitle.indexOf(keyword),
        aEng.indexOf(kw) === -1 ? Infinity : aEng.indexOf(kw)
      )
      const bPos = Math.min(
        bTitle.indexOf(keyword) === -1 ? Infinity : bTitle.indexOf(keyword),
        bEng.indexOf(kw) === -1 ? Infinity : bEng.indexOf(kw)
      )
      
      if (aPos !== bPos) return aPos - bPos

      // 优先级 4: 名字长度 (Shorter first)
      // 如果都以“东京”开头，那么“东京大学”(4) 排在 “东京都立大学”(6) 前面
      return aTitle.length - bTitle.length
    })

    // 3. 返回前 10 条结果 (增加展示量)
    return {
      data: items.slice(0, 10)
    }
  } catch (e) {
    console.error(e)
    return { data: [], error: e }
  }
}
