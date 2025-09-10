import { filterComments } from '../../../utils/commentFilter'
import { smartRetryApiCall } from '../../../utils/apiRetry'

// 流式响应辅助函数
function writeStreamData(res, type, data) {
  res.write(`${JSON.stringify({ type, data })}\n`)
}

async function fetchVideoInfo(videoId, apiKey) {
  return await smartRetryApiCall(async () => {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`
    
    console.log('正在请求YouTube API:', url)
    
    // 创建AbortController来控制超时
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      clearTimeout(timeoutId)
      console.log('API响应状态:', response.status)
      
      if (!response.ok) {
        const error = new Error(`YouTube API error: ${response.status}`)
        error.response = response
        throw error
      }

      const data = await response.json()
      console.log('视频信息获取成功:', data.items?.length || 0, '个视频')
      
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
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }, { maxRetries: 5, initialDelay: 2000 }) // 增加重试次数
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

    console.log('正在获取评论页:', url.toString())

    // 创建AbortController来控制超时
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      clearTimeout(timeoutId)
      console.log('评论API响应状态:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const error = new Error(`YouTube API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
        error.response = response
        throw error
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }, { maxRetries: 5, initialDelay: 3000 }) // 评论获取重试间隔更长
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

export async function POST(req) {
  try {
    const { videoId } = await req.json()

    if (!videoId) {
      return new Response(JSON.stringify({ error: '缺少视频ID参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'YouTube API Key未配置' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        const writeData = (type, data) => {
          controller.enqueue(encoder.encode(`${JSON.stringify({ type, data })}\n`))
        }

        try {
          // 获取视频信息
          writeData('progress', { stage: '获取视频信息...', percentage: 0 })
          
          const videoInfo = await fetchVideoInfo(videoId, apiKey)
          writeData('videoInfo', videoInfo)
          writeData('progress', { stage: '开始采集评论...', percentage: 5 })

          let allComments = []
          let nextPageToken = ''
          let totalFetched = 0
          const estimatedTotal = parseInt(videoInfo.commentCount) || 1000
          let pageCount = 0
          const maxPages = 100 // 防止无限循环

          do {
            try {
              pageCount++
              writeData('progress', {
                stage: `采集第 ${pageCount} 页评论...`,
                percentage: Math.min(10 + (totalFetched / estimatedTotal) * 70, 75),
                current: totalFetched,
                total: estimatedTotal
              })

              const data = await fetchCommentsPage(videoId, apiKey, nextPageToken)
              
              console.log(`第 ${pageCount} 页API返回数据:`, {
                hasItems: !!data.items,
                itemsLength: data.items?.length || 0,
                nextPageToken: data.nextPageToken
              })
              
              if (data.items && data.items.length > 0) {
                const pageComments = processComments(data.items)
                console.log(`第 ${pageCount} 页处理后评论数:`, pageComments.length)
                
                // 过滤评论
                const filteredComments = filterComments(pageComments)
                console.log(`第 ${pageCount} 页过滤后评论数:`, filteredComments.length)
                
                allComments = allComments.concat(filteredComments)
                totalFetched += pageComments.length

                // 发送这一批评论
                if (filteredComments.length > 0) {
                  writeData('comments', filteredComments)
                  console.log(`发送第 ${pageCount} 页评论:`, filteredComments.length, '条')
                } else {
                  console.log(`第 ${pageCount} 页评论全部被过滤`)
                }

                writeData('progress', {
                  stage: `已采集 ${totalFetched} 条评论`,
                  percentage: Math.min(10 + (totalFetched / estimatedTotal) * 70, 75),
                  current: totalFetched,
                  total: estimatedTotal
                })
              } else {
                console.log(`第 ${pageCount} 页无评论数据`)
              }

              nextPageToken = data.nextPageToken
              
              // 添加延迟避免API限制
              if (nextPageToken && pageCount < maxPages) {
                await new Promise(resolve => setTimeout(resolve, 100))
              }

            } catch (pageError) {
              console.error(`获取第 ${pageCount} 页失败:`, pageError)
              writeData('error', `获取第 ${pageCount} 页失败: ${pageError.message}`)
              break
            }
          } while (nextPageToken && pageCount < maxPages)

          // 完成采集
          writeData('progress', {
            stage: `评论采集完成，共获取 ${allComments.length} 条有效评论`,
            percentage: 100,
            current: allComments.length,
            total: allComments.length
          })

          writeData('complete', {
            totalComments: allComments.length,
            totalFetched: totalFetched,
            videoInfo: videoInfo
          })

        } catch (error) {
          console.error('采集评论失败:', error)
          writeData('error', error.message)
        }
        
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('API处理错误:', error)
    return new Response(JSON.stringify({ error: '服务器内部错误: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}