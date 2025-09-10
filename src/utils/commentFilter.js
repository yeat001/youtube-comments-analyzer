// 评论过滤配置
export const filterConfig = {
  minTextLength: 5,        // 最小字符数
  maxTextLength: 1000,     // 最大字符数
  filterEmojis: true,      // 是否过滤纯表情
  filterRepeated: true     // 是否去重
}

/**
 * 检查文本是否只包含表情符号
 * @param {string} text - 要检查的文本
 * @returns {boolean} - 是否只包含表情
 */
function isOnlyEmojis(text) {
  // 表情符号Unicode范围
  const emojiRegex = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}\u{2695}\u{26F9}\u{270A}-\u{270D}\u{26F7}\u{26F8}\u{26FA}\s]*$/u
  return emojiRegex.test(text)
}

/**
 * 清理评论文本
 * @param {string} text - 原始文本
 * @returns {string} - 清理后的文本
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') return ''
  
  // 去除首尾空格和换行符
  return text.trim().replace(/\s+/g, ' ')
}

/**
 * 检查评论是否应该被过滤
 * @param {Object} comment - 评论对象
 * @returns {boolean} - 是否应该过滤掉
 */
function shouldFilterComment(comment) {
  if (!comment || !comment.textDisplay) return true
  
  const cleanedText = cleanText(comment.textDisplay)
  
  // 检查文本长度
  if (cleanedText.length < filterConfig.minTextLength || 
      cleanedText.length > filterConfig.maxTextLength) {
    return true
  }
  
  // 检查是否只包含表情
  if (filterConfig.filterEmojis && isOnlyEmojis(cleanedText)) {
    return true
  }
  
  return false
}

/**
 * 过滤评论数组
 * @param {Array} comments - 评论数组
 * @returns {Array} - 过滤后的评论数组
 */
export function filterComments(comments) {
  if (!Array.isArray(comments)) return []
  
  let filteredComments = comments.filter(comment => !shouldFilterComment(comment))
  
  // 去重处理
  if (filterConfig.filterRepeated) {
    const seen = new Set()
    filteredComments = filteredComments.filter(comment => {
      const text = cleanText(comment.textDisplay).toLowerCase()
      if (seen.has(text)) {
        return false
      }
      seen.add(text)
      return true
    })
  }
  
  return filteredComments
}

/**
 * 按点赞数排序获取热门评论
 * @param {Array} comments - 评论数组
 * @param {number} limit - 返回数量限制
 * @returns {Array} - 热门评论数组
 */
export function getPopularComments(comments, limit = 50) {
  if (!Array.isArray(comments)) return []
  
  return comments
    .filter(comment => comment.likeCount !== undefined)
    .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
    .slice(0, limit)
}

/**
 * 按时间排序获取最新评论
 * @param {Array} comments - 评论数组
 * @param {number} limit - 返回数量限制
 * @returns {Array} - 最新评论数组
 */
export function getRecentComments(comments, limit = 100) {
  if (!Array.isArray(comments)) return []
  
  return comments
    .filter(comment => comment.publishedAt)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, limit)
}

/**
 * 简单的情感分类（基于关键词）
 * @param {Array} comments - 评论数组
 * @returns {Object} - 分类后的评论对象
 */
export function categorizeCommentsBySentiment(comments) {
  if (!Array.isArray(comments)) {
    return { positive: [], negative: [], neutral: [] }
  }
  
  // 简单的关键词分类（后续可以用AI优化）
  const positiveKeywords = ['好', '棒', '喜欢', '爱', '赞', '优秀', '完美', 'amazing', 'great', 'love', 'awesome', 'perfect', 'excellent']
  const negativeKeywords = ['差', '烂', '讨厌', '不好', '糟糕', '垃圾', 'bad', 'hate', 'terrible', 'awful', 'worst', 'sucks']
  
  const categorized = {
    positive: [],
    negative: [],
    neutral: []
  }
  
  comments.forEach(comment => {
    const text = cleanText(comment.textDisplay).toLowerCase()
    
    const hasPositive = positiveKeywords.some(keyword => text.includes(keyword))
    const hasNegative = negativeKeywords.some(keyword => text.includes(keyword))
    
    if (hasPositive && !hasNegative) {
      categorized.positive.push(comment)
    } else if (hasNegative && !hasPositive) {
      categorized.negative.push(comment)
    } else {
      categorized.neutral.push(comment)
    }
  })
  
  return categorized
}

/**
 * 获取评论统计信息
 * @param {Array} comments - 评论数组
 * @returns {Object} - 统计信息
 */
export function getCommentStats(comments) {
  if (!Array.isArray(comments)) {
    return {
      total: 0,
      mainComments: 0,
      replies: 0,
      totalLikes: 0,
      avgLength: 0
    }
  }
  
  const stats = {
    total: comments.length,
    mainComments: 0,
    replies: 0,
    totalLikes: 0,
    avgLength: 0
  }
  
  let totalLength = 0
  
  comments.forEach(comment => {
    // 统计主评论和回复
    if (comment.level === 0) {
      stats.mainComments++
    } else {
      stats.replies++
    }
    
    // 统计点赞数
    stats.totalLikes += comment.likeCount || 0
    
    // 统计文本长度
    const textLength = cleanText(comment.textDisplay).length
    totalLength += textLength
  })
  
  // 计算平均长度
  stats.avgLength = stats.total > 0 ? Math.round(totalLength / stats.total) : 0
  
  return stats
}