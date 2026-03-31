const fs = require('node:fs')
const path = require('node:path')

async function searchInzEmployers (query, page = 1) {
  const formData = new URLSearchParams()
  formData.append('query', query.trim())
  formData.append('collection', '2')
  formData.append('page', String(page))

  const response = await fetch('https://www.immigration.govt.nz/list-api/getAPIResults/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0'
    },
    body: formData
  })

  if (!response.ok) {
    throw new Error(`HTTP_${response.status}`)
  }

  const data = await response.json()

  if (data && data.Message && !data.results) {
    throw new Error(data.Message)
  }

  let items = []
  try {
    items = JSON.parse(data.results || '[]')
  } catch {
    items = []
  }

  const results = items.map(item => {
    const fields = {}
    if (item.field_schema && item.field_schema.raw) {
      item.field_schema.raw.forEach(f => {
        fields[f.APIColumn] = f.Value
      })
    }
    return fields
  })

  return {
    totalPages: data.totalPages || 0,
    totalResults: data.totalResults || 0,
    results
  }
}

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 读文件
  readFile (file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },
  // 文本写入到下载目录
  writeTextFile (text) {
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  },
  // 图片写入到下载目录
  writeImageFile (base64Url) {
    const matchs = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matchs) return
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.' + matchs[1])
    fs.writeFileSync(filePath, base64Url.substring(matchs[0].length), { encoding: 'base64' })
    return filePath
  },
  searchInzEmployers
}
