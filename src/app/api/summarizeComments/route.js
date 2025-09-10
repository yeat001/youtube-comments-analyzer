import { getPopularComments, getRecentComments, categorizeCommentsBySentiment } from '../../../utils/commentFilter'
import { smartRetryApiCall } from '../../../utils/apiRetry'

// Gemini AI 总结函数
async function generateSummaryWithGemini(comments, strategy, apiKey, totalComments = 0) {
  return await smartRetryApiCall(async () => {
    const commentsText = comments.map(c => 
      `${c.translatedText || c.textDisplay || c.textOriginal} (👍${c.likeCount})`
    ).join('\n')

    const strategyPrompts = {
      full: `请基于以下 ${totalComments || comments.length} 条YouTube评论进行全面分析总结`,
      popular: `请基于以下热门YouTube评论（按点赞数排序）进行分析总结`,
      recent: `请基于以下最新YouTube评论进行分析总结`,
      sentiment: `请基于以下已分类的YouTube评论进行情感分析总结`
    }

    const prompt = `${strategyPrompts[strategy] || strategyPrompts.full}：

${commentsText}

请从以下5个维度进行深度分析，并提供具体的数据支撑和改进建议：

## 1. 用户喜好分析
- 用户最欣赏的内容特点和亮点
- 获得高赞的评论类型分析
- 用户认为做得好的地方

## 2. 用户不满分析  
- 用户主要抱怨和不满的问题点
- 需要改进的具体方面
- 用户提出的批评和建议

## 3. 内容期待分析
- 用户希望看到更多的内容类型
- 对未来内容的期待和建议
- 用户感兴趣的话题方向

## 4. 视频优化建议
- 基于评论反馈的具体改进建议
- 内容制作方面的优化方向
- 用户体验提升建议

## 5. 目标用户画像分析
- 主要观众群体特征分析
- 用户兴趣爱好和需求总结
- 不同类型用户的反馈差异

请确保分析具体、有数据支撑，避免空泛的总结。每个维度都要提供3-5个具体的观点或建议。`

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = new Error(`Gemini API错误: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      error.response = response
      throw error
    }

    const data = await response.json()
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || '无法生成总结'
    
    return summary
  }, { 
    maxRetries: 3, 
    initialDelay: 2000,
    backoffFactor: 2.0
  })
}

// 分割评论为批次
function splitCommentsIntoBatches(comments, batchSize = 500) {
  const batches = []
  for (let i = 0; i < comments.length; i += batchSize) {
    batches.push(comments.slice(i, i + batchSize))
  }
  return batches
}

// 生成批次总结
async function generateBatchSummaries(commentBatches, strategy, apiKey) {
  const batchSummaries = []
  
  for (let i = 0; i < commentBatches.length; i++) {
    const batch = commentBatches[i]
    console.log(`正在生成第 ${i + 1}/${commentBatches.length} 批总结，包含 ${batch.length} 条评论`)
    
    try {
      const batchSummary = await generateSummaryWithGemini(batch, strategy, apiKey)
      batchSummaries.push({
        batchIndex: i + 1,
        commentCount: batch.length,
        summary: batchSummary
      })
      
      // 批次之间添加延迟
      if (i < commentBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      console.error(`第 ${i + 1} 批总结失败:`, error)
      batchSummaries.push({
        batchIndex: i + 1,
        commentCount: batch.length,
        summary: `第 ${i + 1} 批总结生成失败: ${error.message}`
      })
    }
  }
  
  return batchSummaries
}

// 合并批次总结
async function mergeBatchSummaries(batchSummaries, strategy, apiKey, totalComments) {
  const validSummaries = batchSummaries.filter(b => !b.summary.includes('失败'))
  if (validSummaries.length === 0) {
    throw new Error('所有批次总结都失败了')
  }

  const mergePrompt = `请将以下 ${validSummaries.length} 个批次的YouTube评论分析总结合并为一个完整的综合分析报告。

总评论数：${totalComments} 条

各批次总结：
${validSummaries.map(b => `
批次 ${b.batchIndex} (${b.commentCount} 条评论)：
${b.summary}
`).join('\n---\n')}

请合并以上分析，形成一个统一、完整的总结报告，保持原有的5个分析维度：
1. 用户喜好分析
2. 用户不满分析  
3. 内容期待分析
4. 视频优化建议
5. 目标用户画像分析

确保合并后的报告逻辑清晰，避免重复，突出最重要的洞察。`

  return await smartRetryApiCall(async () => {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: mergePrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = new Error(`Gemini API错误: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      error.response = response
      throw error
    }

    const data = await response.json()
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || '无法生成总结'
    
    return summary
  }, { 
    maxRetries: 3, 
    initialDelay: 2000,
    backoffFactor: 2.0
  })
}

export async function POST(req) {
  const { comments, strategy = 'full' } = await req.json()

  if (!Array.isArray(comments) || comments.length === 0) {
    return new Response(JSON.stringify({ error: '缺少评论数据' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Gemini API Key未配置' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    let selectedComments = comments
    let summaryText = ''

    // 根据策略选择评论
    switch (strategy) {
      case 'popular':
        selectedComments = getPopularComments(comments, 50)
        break
      case 'recent':
        selectedComments = getRecentComments(comments, 100)
        break
      case 'sentiment':
        const categorized = categorizeCommentsBySentiment(comments)
        selectedComments = [
          ...categorized.positive.slice(0, 50),
          ...categorized.negative.slice(0, 50),
          ...categorized.neutral.slice(0, 50)
        ]
        break
      case 'full':
      default:
        selectedComments = comments
        break
    }

    // 如果评论数量超过500条，使用批量处理
    if (strategy === 'full' && selectedComments.length > 500) {
      console.log(`评论数量较多(${selectedComments.length}条)，使用批量处理模式`)
      const commentBatches = splitCommentsIntoBatches(selectedComments, 500)
      const batchSummaries = await generateBatchSummaries(commentBatches, strategy, apiKey)
      summaryText = await mergeBatchSummaries(batchSummaries, strategy, apiKey, selectedComments.length)
    } else {
      // 直接生成总结
      summaryText = await generateSummaryWithGemini(selectedComments, strategy, apiKey, selectedComments.length)
    }

    const result = {
      strategy,
      totalComments: comments.length,
      analyzedComments: selectedComments.length,
      summary: summaryText,
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('生成总结失败:', error)
    return new Response(JSON.stringify({ 
      error: '生成总结失败：' + error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}