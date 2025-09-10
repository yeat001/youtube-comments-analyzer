import * as XLSX from 'xlsx'

/**
 * 将评论数据导出为Excel文件
 * @param {Array} comments - 评论数据数组
 * @param {Object} videoInfo - 视频信息
 * @param {string} filename - 文件名（不含扩展名）
 */
export function exportCommentsToExcel(comments, videoInfo = null, filename = 'youtube-comments') {
  if (!Array.isArray(comments) || comments.length === 0) {
    console.warn('没有评论数据可以导出')
    return
  }

  // 创建工作簿
  const workbook = XLSX.utils.book_new()

  // 准备评论数据
  const commentData = comments.map(comment => ({
    '评论ID': comment.id || '',
    '原文': comment.textDisplay || '',
    '中文翻译': comment.translatedText || '',
    '点赞数': comment.likeCount || 0,
    '回复数': comment.replyCount || 0,
    '用户名': comment.authorDisplayName || '',
    '时间': comment.publishedAt || '',
    '层级': comment.level || 0,
    '父评论ID': comment.parentId || null
  }))

  // 创建评论数据工作表
  const commentsWorksheet = XLSX.utils.json_to_sheet(commentData)

  // 设置列宽
  const columnWidths = [
    { wch: 15 }, // 评论ID
    { wch: 40 }, // 原文
    { wch: 40 }, // 中文翻译
    { wch: 10 }, // 点赞数
    { wch: 10 }, // 回复数
    { wch: 20 }, // 用户名
    { wch: 20 }, // 时间
    { wch: 8 },  // 层级
    { wch: 15 }  // 父评论ID
  ]
  commentsWorksheet['!cols'] = columnWidths

  // 添加评论工作表
  XLSX.utils.book_append_sheet(workbook, commentsWorksheet, '评论数据')

  // 如果有视频信息，创建视频信息工作表
  if (videoInfo) {
    const videoData = [
      ['视频标题', videoInfo.title || ''],
      ['频道名称', videoInfo.channelTitle || ''],
      ['发布时间', videoInfo.publishedAt || ''],
      ['视频ID', videoInfo.videoId || ''],
      ['视频链接', videoInfo.videoUrl || ''],
      ['评论总数', comments.length],
      ['主评论数', comments.filter(c => c.level === 0).length],
      ['回复评论数', comments.filter(c => c.level === 1).length],
      ['导出时间', new Date().toLocaleString('zh-CN')]
    ]

    const videoWorksheet = XLSX.utils.aoa_to_sheet(videoData)
    videoWorksheet['!cols'] = [{ wch: 15 }, { wch: 50 }]
    XLSX.utils.book_append_sheet(workbook, videoWorksheet, '视频信息')
  }

  // 生成文件名
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const finalFilename = `${filename}_${timestamp}.xlsx`

  // 导出文件
  try {
    XLSX.writeFile(workbook, finalFilename)
    console.log(`Excel文件已导出: ${finalFilename}`)
    return finalFilename
  } catch (error) {
    console.error('导出Excel文件失败:', error)
    throw error
  }
}

/**
 * 生成Excel文件的Blob对象（用于浏览器下载）
 * @param {Array} comments - 评论数据数组
 * @param {Object} videoInfo - 视频信息
 * @returns {Blob} - Excel文件的Blob对象
 */
export function generateExcelBlob(comments, videoInfo = null) {
  if (!Array.isArray(comments) || comments.length === 0) {
    throw new Error('没有评论数据可以导出')
  }

  // 创建工作簿
  const workbook = XLSX.utils.book_new()

  // 准备评论数据
  const commentData = comments.map(comment => ({
    '评论ID': comment.id || '',
    '原文': comment.textDisplay || '',
    '中文翻译': comment.translatedText || '',
    '点赞数': comment.likeCount || 0,
    '回复数': comment.replyCount || 0,
    '用户名': comment.authorDisplayName || '',
    '时间': comment.publishedAt || '',
    '层级': comment.level || 0,
    '父评论ID': comment.parentId || null
  }))

  // 创建评论数据工作表
  const commentsWorksheet = XLSX.utils.json_to_sheet(commentData)

  // 设置列宽
  const columnWidths = [
    { wch: 15 }, // 评论ID
    { wch: 40 }, // 原文
    { wch: 40 }, // 中文翻译
    { wch: 10 }, // 点赞数
    { wch: 10 }, // 回复数
    { wch: 20 }, // 用户名
    { wch: 20 }, // 时间
    { wch: 8 },  // 层级
    { wch: 15 }  // 父评论ID
  ]
  commentsWorksheet['!cols'] = columnWidths

  // 添加评论工作表
  XLSX.utils.book_append_sheet(workbook, commentsWorksheet, '评论数据')

  // 如果有视频信息，创建视频信息工作表
  if (videoInfo) {
    const videoData = [
      ['视频标题', videoInfo.title || ''],
      ['频道名称', videoInfo.channelTitle || ''],
      ['发布时间', videoInfo.publishedAt || ''],
      ['视频ID', videoInfo.videoId || ''],
      ['视频链接', videoInfo.videoUrl || ''],
      ['评论总数', comments.length],
      ['主评论数', comments.filter(c => c.level === 0).length],
      ['回复评论数', comments.filter(c => c.level === 1).length],
      ['导出时间', new Date().toLocaleString('zh-CN')]
    ]

    const videoWorksheet = XLSX.utils.aoa_to_sheet(videoData)
    videoWorksheet['!cols'] = [{ wch: 15 }, { wch: 50 }]
    XLSX.utils.book_append_sheet(workbook, videoWorksheet, '视频信息')
  }

  // 生成二进制数据
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

  // 创建Blob对象
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

/**
 * 触发浏览器下载Excel文件
 * @param {Array} comments - 评论数据数组
 * @param {Object} videoInfo - 视频信息
 * @param {string} filename - 文件名（不含扩展名）
 */
export function downloadExcelFile(comments, videoInfo = null, filename = 'youtube-comments') {
  try {
    const blob = generateExcelBlob(comments, videoInfo)
    
    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const finalFilename = `${filename}_${timestamp}.xlsx`

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = finalFilename
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    
    // 清理
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    return finalFilename
  } catch (error) {
    console.error('下载Excel文件失败:', error)
    throw error
  }
}

/**
 * 预览Excel数据（返回前几行用于预览）
 * @param {Array} comments - 评论数据数组
 * @param {number} limit - 预览行数限制
 * @returns {Array} - 预览数据
 */
export function previewExcelData(comments, limit = 5) {
  if (!Array.isArray(comments) || comments.length === 0) {
    return []
  }

  return comments.slice(0, limit).map(comment => ({
    '评论ID': comment.id || '',
    '原文': comment.textDisplay || '',
    '中文翻译': comment.translatedText || '',
    '点赞数': comment.likeCount || 0,
    '回复数': comment.replyCount || 0,
    '用户名': comment.authorDisplayName || '',
    '时间': comment.publishedAt || '',
    '层级': comment.level || 0,
    '父评论ID': comment.parentId || null
  }))
}