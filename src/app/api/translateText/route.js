import { smartRetryApiCall } from '../../../utils/apiRetry'

// 使用DeepSeek API批量翻译函数
async function translateBatch(texts, apiKey) {
  return await smartRetryApiCall(async () => {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的翻译助手。请将用户提供的文本准确翻译成中文，保持原意和语气。如果文本已经是中文，请直接返回原文。每行一个翻译结果，不要添加额外说明。'
          },
          {
            role: 'user',
            content: `请将以下文本逐行翻译成中文，每个文本独占一行：\n${texts.join('\n')}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error = new Error(`DeepSeek API错误: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      error.response = response
      throw error
    }

    const data = await response.json()
    const translatedText = data.choices?.[0]?.message?.content || ''
    
    // 将翻译结果按行分割，对应原始texts数组
    const translations = translatedText.split('\n').filter(line => line.trim())
    
    // 确保翻译结果数量与输入数量匹配
    const result = texts.map((originalText, index) => {
      return translations[index] || originalText
    })
    
    return result
  }, { 
    maxRetries: 3, 
    initialDelay: 2000,
    backoffFactor: 1.8 // DeepSeek API使用稍长的重试间隔
  })
}

// 清理翻译文本
function cleanTranslatedText(text) {
  if (!text || typeof text !== 'string') return ''
  
  // 去除多余的空格和换行符
  return text.trim().replace(/\s+/g, ' ')
}

export async function POST(req) {
  const { comments } = await req.json()

  if (!Array.isArray(comments) || comments.length === 0) {
    return new Response(JSON.stringify({ error: '缺少评论数据' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DeepSeek API密钥未配置' }), {
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
        writeData('progress', {
          stage: '开始翻译评论...',
          percentage: 0,
          current: 0,
          total: comments.length
        })

        const batchSize = 10 // 每批翻译10条评论
        const translatedComments = []
        let processedCount = 0

        for (let i = 0; i < comments.length; i += batchSize) {
          const batch = comments.slice(i, i + batchSize)
          const batchTexts = batch.map(comment => comment.textDisplay || comment.textOriginal || '')
          
          try {
            writeData('progress', {
              stage: `翻译第 ${Math.floor(i / batchSize) + 1} 批评论...`,
              percentage: Math.round((processedCount / comments.length) * 100),
              current: processedCount,
              total: comments.length
            })

            // 翻译当前批次
            const translations = await translateBatch(batchTexts, apiKey)
            
            // 处理翻译结果
            const batchTranslated = batch.map((comment, index) => {
              const translatedText = translations[index] 
                ? cleanTranslatedText(translations[index])
                : comment.textDisplay || comment.textOriginal || ''

              return {
                id: comment.id,
                translatedText: translatedText,
                originalText: comment.textDisplay || comment.textOriginal || ''
              }
            })

            translatedComments.push(...batchTranslated)
            processedCount += batch.length

            // 发送这一批翻译结果
            writeData('translated', batchTranslated)

            writeData('progress', {
              stage: `已翻译 ${processedCount}/${comments.length} 条评论`,
              percentage: Math.round((processedCount / comments.length) * 100),
              current: processedCount,
              total: comments.length
            })

            // 添加延迟避免API限制
            if (i + batchSize < comments.length) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }

          } catch (batchError) {
            console.error(`翻译第 ${Math.floor(i / batchSize) + 1} 批失败:`, batchError)
            
            // 对失败的批次使用原文
            const fallbackBatch = batch.map(comment => ({
              id: comment.id,
              translatedText: comment.textDisplay || comment.textOriginal || '',
              originalText: comment.textDisplay || comment.textOriginal || ''
            }))

            translatedComments.push(...fallbackBatch)
            processedCount += batch.length

            writeData('translated', fallbackBatch)
            writeData('error', `翻译第 ${Math.floor(i / batchSize) + 1} 批失败，使用原文`)
          }
        }

        // 完成翻译
        writeData('progress', {
          stage: `翻译完成，共处理 ${processedCount} 条评论`,
          percentage: 100,
          current: processedCount,
          total: comments.length
        })

        writeData('complete', {
          totalTranslated: translatedComments.length,
          successCount: translatedComments.filter(c => c.translatedText !== c.originalText).length
        })

      } catch (error) {
        console.error('翻译失败:', error)
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
}