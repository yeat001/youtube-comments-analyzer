/**
 * 从YouTube链接中提取视频ID
 * @param {string} url - YouTube视频链接
 * @returns {string|null} - 视频ID或null
 */
export function extractVideoId(url) {
  if (!url || typeof url !== 'string') return null

  // 清理URL，去除空格
  url = url.trim()

  // 匹配各种YouTube URL格式
  const patterns = [
    // https://www.youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // https://youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // https://www.youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // https://www.youtube.com/v/VIDEO_ID
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    // https://www.youtube.com/shorts/VIDEO_ID 或 https://youtube.com/shorts/VIDEO_ID
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * 验证YouTube链接是否有效
 * @param {string} url - YouTube视频链接
 * @returns {boolean} - 是否有效
 */
export function isValidYouTubeUrl(url) {
  return extractVideoId(url) !== null
}

/**
 * 格式化YouTube视频链接
 * @param {string} videoId - 视频ID
 * @returns {string} - 标准化的YouTube链接
 */
export function formatYouTubeUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`
}

/**
 * 生成YouTube缩略图URL
 * @param {string} videoId - 视频ID
 * @param {string} quality - 图片质量 (default, medium, high, standard, maxres)
 * @returns {string} - 缩略图URL
 */
export function getYouTubeThumbnail(videoId, quality = 'medium') {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    standard: 'sddefault',
    maxres: 'maxresdefault'
  }

  const qualityParam = qualityMap[quality] || qualityMap.medium
  return `https://img.youtube.com/vi/${videoId}/${qualityParam}.jpg`
}