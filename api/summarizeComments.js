import { getPopularComments, getRecentComments, categorizeCommentsBySentiment } from '../../src/utils/commentFilter'
import { smartRetryApiCall } from '../../src/utils/apiRetry'

// 添加CORS头
function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

// 生成总结的Prompt模板
const SUMMARY_PROMPTS = {
  full: `请分析以下YouTube视频评论，从这些维度进行总结：
1. 用户最喜欢的内容特点（具体分析用户积极反馈的内容）
2. 用户不满的问题点（具体分析用户批评和建议的内容）  
3. 用户期待的改进方向（分析用户希望看到的内容或改进）
4. 视频优化建议（基于评论反馈给出具体建议）
5. 目标用户画像分析（推测观众的年龄、兴趣、背景等）

请用中文回答，每个维度用简洁明了的语言总结，重点突出有价值的信息。

评论内容：`,

  popular: `请分析以下YouTube视频的热门评论（按点赞数排序），重点关注最受认可的观点：
1. 最受欢迎的内容特点
2. 用户最认同的观点
3. 主流用户的期待
4. 基于热门反馈的优化建议
5. 核心用户群体特征

评论内容：`,

  recent: `请分析以下YouTube视频的最新评论，关注当前用户反馈趋势：
1. 最新的用户反馈趋势
2. 当前用户关注的焦点
3. 最新出现的问题或建议
4. 近期用户期待的变化
5. 当前观众群体特点

评论内容：`,

  positive: `请分析以下YouTube视频的正面评论，总结用户喜欢的内容：
1. 用户最喜爱的具体内容点
2. 正面评价的共同特征
3. 值得保持和发扬的优点
4. 用户认为的亮点和特色
5. 满意用户的画像特征

评论内容：`,

  negative: `请分析以下YouTube视频的负面评论，总结用户不满和建议：
1. 用户主要不满的问题点
2. 最常见的批评和建议
3. 需要改进的具体方面
4. 用户期待的解决方案
5. 不满用户的特征分析

评论内容：`,

  neutral: `请分析以下YouTube视频的中性评论，总结客观反馈：
1. 用户的客观评价和观察
2. 中性反馈中的建设性意见
3. 理性分析的改进建议
4. 平衡视角下的优缺点
5. 理性用户群体特征

评论内容：`
}

// 准备评论数据用于AI分析 - 支持分批处理
function prepareCommentsForAnalysis(comments, strategy) {
  let selectedComments = []

  switch (strategy) {
    case 'popular':
      selectedComments = getPopularComments(comments, 50)
      break
    case 'recent':
      selectedComments = getRecentComments(comments, 100)
      break
    case 'positive':
      const categorized1 = categorizeCommentsBySentiment(comments)
      selectedComments = categorized1.positive.slice(0, 100)
      break
    case 'negative':
      const categorized2 = categorizeCommentsBySentiment(comments)
      selectedComments = categorized2.negative.slice(0, 100)
      break
    case 'neutral':
      const categorized3 = categorizeCommentsBySentiment(comments)
      selectedComments = categorized3.neutral.slice(0, 100)
      break
    case 'full':
    default:
      // 全量分析时，处理所有评论
      selectedComments = comments
      break
  }

  return selectedComments
}

// 将评论分批，每批500条
function splitCommentsIntoBatches(comments, batchSize = 500) {
  const batches = []
  for (let i = 0; i < comments.length; i += batchSize) {
    batches.push(comments.slice(i, i + batchSize))
  }
  return batches
}

// 格式化单批评论为文本
function formatCommentsForAI(comments) {
  return comments.map(comment => {
    const text = comment.translatedText || comment.textDisplay || ''
    const likes = comment.likeCount || 0
    const author = comment.authorDisplayName || '匿名'
    return `[${author}] (👍${likes}) ${text}`
  }).join('\n')
}

// 分批生成总结
async function generateBatchSummaries(commentBatches, strategy, apiKey) {
  const batchPromises = commentBatches.map(async (batch, index) => {
    const batchText = formatCommentsForAI(batch)
    const basePrompt = SUMMARY_PROMPTS[strategy] || SUMMARY_PROMPTS.full
    const prompt = basePrompt + '\n\n' + batchText + '\n\n注意：这是一批评论数据，请简要总结。'

    try {
      const summary = await generateSummaryWithGemini(prompt, apiKey)
      return {
        batchIndex: index,
        summary: summary,
        commentCount: batch.length
      }
    } catch (error) {
      console.error(`批次 ${index + 1} 总结失败:`, error)
      return {
        batchIndex: index,
        summary: `批次 ${index + 1} 总结失败: ${error.message}`,
        commentCount: batch.length,
        error: true
      }
    }
  })

  return await Promise.all(batchPromises)
}

// 合并多个批次的总结
async function mergeBatchSummaries(batchSummaries, strategy, apiKey, totalComments) {
  // 过滤出成功的总结
  const successfulSummaries = batchSummaries.filter(batch => !batch.error)
  
  if (successfulSummaries.length === 0) {
    throw new Error('所有批次总结都失败了')
  }

  // 如果只有一个批次，直接返回
  if (successfulSummaries.length === 1) {
    return successfulSummaries[0].summary
  }

  // 合并多个批次的总结
  const combinedSummaries = successfulSummaries.map(batch => 
    `## 批次 ${batch.batchIndex + 1} (${batch.commentCount}条评论)\n${batch.summary}`
  ).join('\n\n')

  const mergePrompt = `
请将以下多个批次的YouTube评论总结合并为一个完整的总结报告。

要求：
1. 综合所有批次的信息
2. 保持原有的分析维度
3. 避免重复内容
4. 突出主要趋势和共识
5. 用中文回答

总评论数：${totalComments} 条
分析策略：${strategy}

批次总结内容：
${combinedSummaries}

请提供合并后的完整总结：
`

  try {
    return await generateSummaryWithGemini(mergePrompt, apiKey)
  } catch (error) {
    console.error('合并总结失败:', error)
    // 如果合并失败，返回拼接的总结
    return `## 评论分析总结\n\n总评论数：${totalComments} 条\n处理批次：${successfulSummaries.length} 个\n\n${combinedSummaries}`
  }
}

// 调用Gemini API
async function generateSummaryWithGemini(prompt, apiKey) {
  return await smartRetryApiCall(async () => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = new Error(`Gemini API错误: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      error.response = response
      throw error
    }

    const data = await response.json()
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text
    } else {
      throw new Error('Gemini API返回格式异常')
    }
  }, {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 10000, // AI API重试间隔较长
    backoffFactor: 2
  })
}

// 解析AI总结结果
function parseSummaryResult(summaryText) {
  const lines = summaryText.split('\n').map(line => line.trim()).filter(line => line)
  
  const result = {
    userLikes: '',
    userDislikes: '',
    userExpectations: '',
    improvements: '',
    userProfile: ''
  }

  let currentSection = ''
  let currentContent = []

  for (const line of lines) {
    if (line.match(/^[1-5][\.\)]\s*(.+)/)) {
      // 保存上一个部分
      if (currentSection && currentContent.length > 0) {
        result[currentSection] = currentContent.join(' ').trim()
      }

      // 开始新的部分
      const content = line.replace(/^[1-5][\.\)]\s*/, '')
      
      if (line.startsWith('1')) {
        currentSection = 'userLikes'
      } else if (line.startsWith('2')) {
        currentSection = 'userDislikes'
      } else if (line.startsWith('3')) {
        currentSection = 'userExpectations'
      } else if (line.startsWith('4')) {
        currentSection = 'improvements'
      } else if (line.startsWith('5')) {
        currentSection = 'userProfile'
      }
      
      currentContent = [content]
    } else if (currentSection && line) {
      currentContent.push(line)
    }
  }

  // 保存最后一个部分
  if (currentSection && currentContent.length > 0) {
    result[currentSection] = currentContent.join(' ').trim()
  }

  return result
}

export default async function handler(req, res) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { comments, strategy = 'full' } = req.body

  if (!Array.isArray(comments) || comments.length === 0) {
    res.status(400).json({ error: '缺少评论数据' })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Gemini API Key未配置' })
    return
  }

  try {
    // 准备分析数据
    const selectedComments = prepareCommentsForAnalysis(comments, strategy)
    
    if (!selectedComments || selectedComments.length === 0) {
      res.status(400).json({ error: '没有找到符合条件的评论进行分析' })
      return
    }

    let summaryText = ''

    // 根据评论数量决定是否分批处理
    if (strategy === 'full' && selectedComments.length > 500) {
      console.log(`开始分批总结，共 ${selectedComments.length} 条评论`)
      
      // 分批处理
      const commentBatches = splitCommentsIntoBatches(selectedComments, 500)
      console.log(`分为 ${commentBatches.length} 个批次`)
      
      // 生成各批次总结
      const batchSummaries = await generateBatchSummaries(commentBatches, strategy, apiKey)
      
      // 合并批次总结
      summaryText = await mergeBatchSummaries(batchSummaries, strategy, apiKey, selectedComments.length)
      
    } else {
      // 单批处理
      const analysisText = formatCommentsForAI(selectedComments)
      const basePrompt = SUMMARY_PROMPTS[strategy] || SUMMARY_PROMPTS.full
      const fullPrompt = basePrompt + '\n\n' + analysisText

      summaryText = await generateSummaryWithGemini(fullPrompt, apiKey)
    }
    
    // 解析总结结果
    const parsedSummary = parseSummaryResult(summaryText)

    // 添加元数据
    const result = {
      ...parsedSummary,
      strategy,
      analysisDate: new Date().toISOString(),
      commentsAnalyzed: selectedComments.length,
      totalComments: comments.length,
      batchProcessed: strategy === 'full' && selectedComments.length > 500,
      rawSummary: summaryText
    }

    res.status(200).json(result)

  } catch (error) {
    console.error('生成总结失败:', error)
    res.status(500).json({ 
      error: '生成总结失败',
      details: error.message 
    })
  }
}