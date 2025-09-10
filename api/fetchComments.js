import { filterComments } from '../../src/utils/commentFilter'
import { smartRetryApiCall } from '../../src/utils/apiRetry'
import { withConcurrencyControl } from '../../src/utils/concurrencyManager'

// 添加CORS头
function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

// 流式响应辅助函数
function writeStreamData(res, type, data) {
  res.write(`${JSON.stringify({ type, data })}\n`)
}

async function fetchVideoInfo(videoId, apiKey) {
  return await smartRetryApiCall(async () => {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`
    
    const response = await fetch(url)
    if (!response.ok) {
      const error = new Error(`YouTube API error: ${response.status}`)
      error.response = response
      throw error
    }

    const data = await response.json()
    if (!data.items || data.items.length === 0) {
      throw new Error('视频不存在或无法访问')
    }

    const video = data.items[0]
    return {
      videoId,
      title: video.snippet.title,
      description: video.snippet.description,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      viewCount: video.statistics.viewCount,
      likeCount: video.statistics.likeCount,
      commentCount: video.statistics.commentCount,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`
    }
  }, { maxRetries: 3, initialDelay: 1000 })
}

async function fetchCommentsPage(videoId, apiKey, pageToken = '', maxResults = 100) {
  return await smartRetryApiCall(async () => {
    const url = new URL('https://www.googleapis.com/youtube/v3/commentThreads')
    url.searchParams.set('part', 'snippet,replies')
    url.searchParams.set('videoId', videoId)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('maxResults', maxResults.toString())
    url.searchParams.set('order', 'time')
    
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken)
    }

    const response = await fetch(url.toString())
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = new Error(`YouTube API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      error.response = response
      throw error
    }

    return await response.json()
  }, { maxRetries: 3, initialDelay: 2000 }) // 评论获取失败重试间隔更长
}

function processComments(commentThreads) {
  const comments = []

  commentThreads.forEach(thread => {
    // 主评论
    const topLevelComment = thread.snippet.topLevelComment.snippet
    const mainComment = {
      id: thread.snippet.topLevelComment.id,
      textDisplay: topLevelComment.textDisplay,
      textOriginal: topLevelComment.textOriginal,
      authorDisplayName: topLevelComment.authorDisplayName,
      authorChannelId: topLevelComment.authorChannelId?.value,
      likeCount: topLevelComment.likeCount,
      publishedAt: topLevelComment.publishedAt,
      updatedAt: topLevelComment.updatedAt,
      replyCount: thread.snippet.totalReplyCount || 0,
      level: 0,
      parentId: null
    }
    comments.push(mainComment)

    // 回复评论
    if (thread.replies?.comments) {
      thread.replies.comments.forEach(reply => {
        const replySnippet = reply.snippet
        const replyComment = {
          id: reply.id,
          textDisplay: replySnippet.textDisplay,
          textOriginal: replySnippet.textOriginal,
          authorDisplayName: replySnippet.authorDisplayName,
          authorChannelId: replySnippet.authorChannelId?.value,
          likeCount: replySnippet.likeCount,
          publishedAt: replySnippet.publishedAt,
          updatedAt: replySnippet.updatedAt,
          replyCount: 0,
          level: 1,
          parentId: thread.snippet.topLevelComment.id
        }
        comments.push(replyComment)
      })
    }
  })

  return comments
}

async function fetchCommentsHandler(req, res) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { videoId } = req.body

  if (!videoId) {
    res.status(400).json({ error: '缺少视频ID参数' })
    return
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'YouTube API Key未配置' })
    return
  }

  // 设置SSE头
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    // 获取视频信息
    writeStreamData(res, 'progress', { stage: '获取视频信息...', percentage: 0 })
    
    const videoInfo = await fetchVideoInfo(videoId, apiKey)
    writeStreamData(res, 'videoInfo', videoInfo)
    writeStreamData(res, 'progress', { stage: '开始采集评论...', percentage: 5 })

    let allComments = []
    let nextPageToken = ''
    let totalFetched = 0
    const estimatedTotal = parseInt(videoInfo.commentCount) || 1000
    let pageCount = 0
    const maxPages = 100 // 防止无限循环

    do {
      try {
        pageCount++
        writeStreamData(res, 'progress', {
          stage: `采集第 ${pageCount} 页评论...`,
          percentage: Math.min(10 + (totalFetched / estimatedTotal) * 70, 75),
          current: totalFetched,
          total: estimatedTotal
        })

        const data = await fetchCommentsPage(videoId, apiKey, nextPageToken)
        
        if (data.items && data.items.length > 0) {
          const pageComments = processComments(data.items)
          
          // 过滤评论
          const filteredComments = filterComments(pageComments)
          allComments = allComments.concat(filteredComments)
          totalFetched += pageComments.length

          // 发送这一批评论
          if (filteredComments.length > 0) {
            writeStreamData(res, 'comments', filteredComments)
          }

          writeStreamData(res, 'progress', {
            stage: `已采集 ${totalFetched} 条评论`,
            percentage: Math.min(10 + (totalFetched / estimatedTotal) * 70, 75),
            current: totalFetched,
            total: estimatedTotal
          })
        }

        nextPageToken = data.nextPageToken
        
        // 添加延迟避免API限制
        if (nextPageToken && pageCount < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

      } catch (pageError) {
        console.error(`获取第 ${pageCount} 页失败:`, pageError)
        writeStreamData(res, 'error', `获取第 ${pageCount} 页失败: ${pageError.message}`)
        break
      }
    } while (nextPageToken && pageCount < maxPages)

    // 完成采集
    writeStreamData(res, 'progress', {
      stage: `评论采集完成，共获取 ${allComments.length} 条有效评论`,
      percentage: 100,
      current: allComments.length,
      total: allComments.length
    })

    writeStreamData(res, 'complete', {
      totalComments: allComments.length,
      totalFetched: totalFetched,
      videoInfo: videoInfo
    })

  } catch (error) {
    console.error('采集评论失败:', error)
    writeStreamData(res, 'error', error.message)
  }

  res.end()
}

// 导出带并发控制的处理函数
export default withConcurrencyControl(fetchCommentsHandler)