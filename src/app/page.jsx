'use client'

import { useState, useRef } from 'react'
import { extractVideoId } from '../utils/videoUtils'
import { filterComments } from '../utils/commentFilter'
import CommentInput from '../components/CommentInput'
import ProgressBar from '../components/ProgressBar'
import CommentList from '../components/CommentList'
import SummaryPanel from '../components/SummaryPanel'
import ExcelExport from '../components/ExcelExport'

export default function Home() {
  const [videoUrl, setVideoUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStage, setCurrentStage] = useState('') // 'comments', 'translate', 'summary'
  const [progress, setProgress] = useState({ stage: '', percentage: 0, current: 0, total: 0, startTime: null })
  const [comments, setComments] = useState([])
  const [summary, setSummary] = useState(null)
  const [videoInfo, setVideoInfo] = useState(null)
  const [error, setError] = useState('')
  const abortControllerRef = useRef(null)

  const handleStartProcess = async (url) => {
    setVideoUrl(url)
    setIsProcessing(true)
    setCurrentStage('comments')
    setProgress({ stage: '开始采集...', percentage: 0, current: 0, total: 0, startTime: Date.now() })
    setComments([])
    setSummary(null)
    setVideoInfo(null)
    setError('')

    const videoId = extractVideoId(url)
    if (!videoId) {
      setError('无法从URL中提取视频ID')
      setIsProcessing(false)
      return
    }

    // 创建AbortController用于取消请求
    abortControllerRef.current = new AbortController()

    try {
      // 阶段1: 采集评论
      const collectedComments = await fetchComments(videoId)
      
      if (abortControllerRef.current?.signal.aborted) return
      
      // 阶段2: 翻译评论
      if (collectedComments && collectedComments.length > 0) {
        setCurrentStage('translate')
        await translateComments(collectedComments)
        
        // 阶段3: 自动生成AI总结
        if (abortControllerRef.current?.signal.aborted) return
        setCurrentStage('summary')
        setProgress(prev => ({ ...prev, stage: '开始生成AI总结...', percentage: 90 }))
        await handleGenerateSummary('full', collectedComments)
      }

      setIsProcessing(false)
      setProgress(prev => ({ ...prev, stage: '全部完成！', percentage: 100 }))
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('用户取消了操作')
      } else {
        console.error('处理失败:', error)
        setError(error.message || '处理过程中发生错误')
      }
      setIsProcessing(false)
    }
  }

  const fetchComments = async (videoId) => {
    let allComments = []
    try {
      setProgress(prev => ({ ...prev, stage: '获取视频信息...', percentage: 0 }))
      
      // 直接在前端调用YouTube API
      const apiKey = 'AIzaSyASNUeYZGjDxitrN-8HqijvKXypgDwbvwM'
      
      // 获取视频信息
      const videoResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`)
      if (!videoResponse.ok) {
        throw new Error(`YouTube API错误: ${videoResponse.status}`)
      }
      
      const videoData = await videoResponse.json()
      if (!videoData.items || videoData.items.length === 0) {
        throw new Error('视频不存在或无法访问')
      }
      
      const video = videoData.items[0]
      const videoInfo = {
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
      
      setVideoInfo(videoInfo)
      setProgress(prev => ({ ...prev, stage: '开始采集评论...', percentage: 5 }))
      
      // 获取评论
      let nextPageToken = ''
      let totalFetched = 0
      const estimatedTotal = parseInt(videoInfo.commentCount) || 1000
      let pageCount = 0
      const maxPages = 10 // 限制页数避免太慢
      
      do {
        pageCount++
        setProgress(prev => ({
          ...prev,
          stage: `采集第 ${pageCount} 页评论...`,
          percentage: Math.min(10 + (totalFetched / estimatedTotal) * 70, 75),
          current: totalFetched,
          total: estimatedTotal
        }))
        
        let url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${videoId}&key=${apiKey}&maxResults=100&order=time`
        if (nextPageToken) {
          url += `&pageToken=${nextPageToken}`
        }
        
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`评论API错误: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.items && data.items.length > 0) {
          // 处理评论数据
          const pageComments = []
          data.items.forEach(thread => {
            // 主评论
            const topComment = thread.snippet.topLevelComment.snippet
            pageComments.push({
              id: thread.snippet.topLevelComment.id,
              textDisplay: topComment.textDisplay,
              textOriginal: topComment.textOriginal,
              authorDisplayName: topComment.authorDisplayName,
              likeCount: topComment.likeCount,
              publishedAt: topComment.publishedAt,
              level: 0,
              parentId: null
            })
            
            // 回复评论
            if (thread.replies?.comments) {
              thread.replies.comments.forEach(reply => {
                pageComments.push({
                  id: reply.id,
                  textDisplay: reply.snippet.textDisplay,
                  textOriginal: reply.snippet.textOriginal,
                  authorDisplayName: reply.snippet.authorDisplayName,
                  likeCount: reply.snippet.likeCount,
                  publishedAt: reply.snippet.publishedAt,
                  level: 1,
                  parentId: thread.snippet.topLevelComment.id
                })
              })
            }
          })
          
          // 过滤评论（使用专门的过滤函数）
          const filteredComments = filterComments(pageComments)
          
          allComments = allComments.concat(filteredComments)
          totalFetched += pageComments.length
          
          // 更新评论显示
          setComments(prevComments => [...prevComments, ...filteredComments])
          
          setProgress(prev => ({
            ...prev,
            stage: `已采集 ${totalFetched} 条评论`,
            percentage: Math.min(10 + (totalFetched / estimatedTotal) * 70, 75),
            current: totalFetched,
            total: estimatedTotal
          }))
        }
        
        nextPageToken = data.nextPageToken
        
        // 添加延迟避免API限制
        if (nextPageToken && pageCount < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
      } while (nextPageToken && pageCount < maxPages)
      
      setProgress(prev => ({
        ...prev,
        stage: `评论采集完成，共获取 ${allComments.length} 条有效评论`,
        percentage: 100,
        current: allComments.length,
        total: allComments.length
      }))
      
      return allComments
      
    } catch (error) {
      console.error('采集评论失败:', error)
      setError('采集评论失败：' + error.message)
      return allComments
    }
  }

  const translateComments = async (commentsData) => {
    const commentsToTranslate = commentsData || comments
    if (!commentsToTranslate || commentsToTranslate.length === 0) return

    try {
      setProgress(prev => ({ 
        ...prev, 
        stage: '开始翻译评论...', 
        percentage: 0, 
        current: 0, 
        total: commentsToTranslate.length 
      }))

      // 直接在前端调用DeepSeek API
      const deepSeekApiKey = 'sk-9ee729525f5e40d38ee9088ccfcec4d3'
      const batchSize = 10
      let processedCount = 0

      for (let i = 0; i < commentsToTranslate.length; i += batchSize) {
        if (abortControllerRef.current?.signal.aborted) return
        
        const batch = commentsToTranslate.slice(i, i + batchSize)
        const batchTexts = batch.map(comment => comment.textDisplay || comment.textOriginal || '')
        
        setProgress(prev => ({
          ...prev,
          stage: `翻译第 ${Math.floor(i / batchSize) + 1} 批评论...`,
          percentage: Math.round((processedCount / commentsToTranslate.length) * 100),
          current: processedCount,
          total: commentsToTranslate.length
        }))

        try {
          const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${deepSeekApiKey}`,
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                {
                  role: 'system',
                  content: '你是一个专业的翻译助手。请将用户提供的文本准确翻译成中文，保持原意和简洁性。如果文本已经是中文，请直接返回原文。翻译要求：1)保持原文长度和风格 2)简单词汇用简单中文 3)不要添加解释 4)每行一个翻译结果'
                },
                {
                  role: 'user',
                  content: `请将以下文本逐行翻译成中文，保持简洁，每个文本独占一行：\n${batchTexts.join('\n')}`
                }
              ],
              temperature: 0.3,
              max_tokens: 4000
            }),
            signal: abortControllerRef.current?.signal
          })

          if (!response.ok) {
            throw new Error(`DeepSeek API错误: ${response.status}`)
          }

          const data = await response.json()
          const translatedText = data.choices?.[0]?.message?.content || ''
          const translations = translatedText.split('\n').filter(line => line.trim())

          // 更新这一批评论的翻译
          setComments(prev => prev.map(comment => {
            const batchIndex = batch.findIndex(b => b.id === comment.id)
            if (batchIndex !== -1) {
              return {
                ...comment,
                translatedText: translations[batchIndex] || comment.textDisplay || comment.textOriginal || ''
              }
            }
            return comment
          }))

          processedCount += batch.length

          setProgress(prev => ({
            ...prev,
            stage: `已翻译 ${processedCount}/${commentsToTranslate.length} 条评论`,
            percentage: Math.round((processedCount / commentsToTranslate.length) * 100),
            current: processedCount,
            total: commentsToTranslate.length
          }))

          // 添加延迟避免API限制
          if (i + batchSize < commentsToTranslate.length) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }

        } catch (batchError) {
          console.error(`翻译第 ${Math.floor(i / batchSize) + 1} 批失败:`, batchError)
          processedCount += batch.length
        }
      }

      setProgress(prev => ({
        ...prev,
        stage: `翻译完成，共处理 ${processedCount} 条评论`,
        percentage: 100,
        current: processedCount,
        total: commentsToTranslate.length
      }))

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('翻译失败:', error)
        // 翻译失败不影响主流程，继续进行
      }
    }
  }

  const handleCancelProcess = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsProcessing(false)
    setProgress({ stage: '已取消', percentage: 0, current: 0, total: 0 })
  }

  const handleGenerateSummary = async (strategy = 'full', commentsData = null) => {
    const commentsToAnalyze = commentsData || comments
    if (!commentsToAnalyze || commentsToAnalyze.length === 0) return

    try {
      // 直接在前端调用DeepSeek API进行总结
      const deepSeekApiKey = 'sk-9ee729525f5e40d38ee9088ccfcec4d3'
      
      // 根据策略准备评论数据 - 优化：限制数量提升速度
      let selectedComments = commentsToAnalyze
      let totalComments = commentsToAnalyze.length
      
      // 为了平衡速度和质量，适度限制分析的评论数量
      if (strategy === 'full') {
        selectedComments = commentsToAnalyze.slice(0, 30) // 减少到30条，提升速度
      } else if (strategy === 'popular') {
        selectedComments = commentsToAnalyze
          .filter(comment => comment.likeCount !== undefined)
          .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
          .slice(0, 20) // 热门评论取前20条
      } else if (strategy === 'recent') {
        selectedComments = commentsToAnalyze
          .filter(comment => comment.publishedAt)
          .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
          .slice(0, 20) // 最新评论取前20条
      }

      // 保留部分元信息但简化
      const commentsText = selectedComments.map(c => 
        `${c.translatedText || c.textDisplay || c.textOriginal} (👍${c.likeCount || 0})`
      ).join('\n')

      const strategyPrompts = {
        full: `基于以下${totalComments}条YouTube评论中的代表性${selectedComments.length}条`,
        popular: `基于以下热门YouTube评论（按点赞数排序）`,
        recent: `基于以下最新YouTube评论`,
        sentiment: `基于以下YouTube评论的情感倾向`
      }

      // 优化prompt：更简洁的提示词，减少处理时间
      const prompt = `${strategyPrompts[strategy] || strategyPrompts.full}：

${commentsText}

请简洁分析以下5个维度，每个维度2个要点即可：

1. 用户喜好分析
- 用户最喜欢的内容特点

2. 用户不满分析  
- 主要问题和改进点

3. 内容期待分析
- 用户希望的内容类型

4. 视频优化建议
- 具体改进建议

5. 目标用户画像分析
- 主要观众群体特征

要求：每个要点控制在50字内，引用评论请翻译成中文，避免markdown符号`

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepSeekApiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是专业的YouTube内容分析师。请提供具体、有价值的分析结果，重点关注用户反馈的实用信息。如果需要引用评论内容，请先将非中文内容翻译成中文。输出格式要求简洁，避免使用markdown符号。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API错误: ${response.status}`)
      }

      const data = await response.json()
      const summaryContent = data.choices?.[0]?.message?.content || '无法生成总结'
      
      // 解析DeepSeek返回的完整格式内容
      const parseSummaryContent = (content) => {
        const sections = {}
        
        // 尝试多种分割方式
        // 方式1: 按数字标题分割 (1. 用户喜好分析, 2. 用户不满分析 等)
        let parts = content.split(/\d+\.\s*用户喜好分析|用户不满分析|内容期待分析|视频优化建议|目标用户画像分析/).filter(part => part.trim())
        
        // 方式2: 如果方式1不行，尝试按关键词分割
        if (parts.length < 5) {
          const keywordSplit = content.split(/(用户喜好分析|用户不满分析|内容期待分析|视频优化建议|目标用户画像分析)/)
          const validParts = []
          for (let i = 1; i < keywordSplit.length; i += 2) {
            if (keywordSplit[i + 1]) {
              validParts.push(keywordSplit[i + 1].trim())
            }
          }
          if (validParts.length >= 4) {
            parts = validParts
          }
        }
        
        // 方式3: 按照## 标题分割内容 (兼容原有格式)
        if (parts.length < 5) {
          parts = content.split(/##\s*\d+\.\s*/).filter(part => part.trim())
        }
        
        if (parts.length >= 5) {
          sections.userLikes = parts[0]?.replace(/^.*?(用户喜好分析|1\.\s*用户喜好分析)\s*/, '').replace(/^\d+\.\s*/, '').trim() || ''
          sections.userDislikes = parts[1]?.replace(/^.*?(用户不满分析|2\.\s*用户不满分析)\s*/, '').replace(/^\d+\.\s*/, '').trim() || ''
          sections.userExpectations = parts[2]?.replace(/^.*?(内容期待分析|3\.\s*内容期待分析)\s*/, '').replace(/^\d+\.\s*/, '').trim() || ''
          sections.improvements = parts[3]?.replace(/^.*?(视频优化建议|4\.\s*视频优化建议)\s*/, '').replace(/^\d+\.\s*/, '').trim() || ''
          sections.userProfile = parts[4]?.replace(/^.*?(目标用户画像分析|5\.\s*目标用户画像分析)\s*/, '').replace(/^\d+\.\s*/, '').trim() || ''
        } else if (parts.length >= 3) {
          // 兼容简化版本
          sections.userLikes = parts[0]?.replace(/^.*?用户喜好\s*/, '') || ''
          sections.userDislikes = parts[1]?.replace(/^.*?用户建议\s*/, '') || ''
          sections.userExpectations = ''
          sections.improvements = parts[2]?.replace(/^.*?内容优化\s*/, '') || ''
          sections.userProfile = ''
        } else {
          // 如果完全分割失败，尝试按行手动提取
          const lines = content.split('\n')
          let currentSection = ''
          let sectionContent = {}
          
          for (const line of lines) {
            const trimmedLine = line.trim()
            if (trimmedLine.includes('用户喜好分析') || trimmedLine.includes('1.') && trimmedLine.includes('用户喜好')) {
              currentSection = 'userLikes'
              sectionContent[currentSection] = []
            } else if (trimmedLine.includes('用户不满分析') || trimmedLine.includes('2.') && trimmedLine.includes('用户不满')) {
              currentSection = 'userDislikes'
              sectionContent[currentSection] = []
            } else if (trimmedLine.includes('内容期待分析') || trimmedLine.includes('3.') && trimmedLine.includes('内容期待')) {
              currentSection = 'userExpectations'
              sectionContent[currentSection] = []
            } else if (trimmedLine.includes('视频优化建议') || trimmedLine.includes('4.') && trimmedLine.includes('视频优化')) {
              currentSection = 'improvements'
              sectionContent[currentSection] = []
            } else if (trimmedLine.includes('目标用户画像分析') || trimmedLine.includes('5.') && trimmedLine.includes('目标用户')) {
              currentSection = 'userProfile'
              sectionContent[currentSection] = []
            } else if (currentSection && trimmedLine.length > 0) {
              sectionContent[currentSection].push(trimmedLine)
            }
          }
          
          // 将数组转换为字符串
          for (const key in sectionContent) {
            sections[key] = sectionContent[key].join('\n')
          }
          
          // 如果仍然失败，使用完整内容作为第一个部分
          if (Object.keys(sections).length === 0) {
            sections.userLikes = content
            sections.userDislikes = ''
            sections.userExpectations = ''
            sections.improvements = ''
            sections.userProfile = ''
          }
        }
        
        return sections
      }
      
      // 清理markdown符号的函数
      const cleanMarkdownText = (text) => {
        if (!text) return ''
        
        return text
          // 移除markdown标题符号
          .replace(/^#+\s*/gm, '')
          // 移除粗体符号
          .replace(/\*\*(.*?)\*\*/g, '$1')
          // 移除斜体符号
          .replace(/\*(.*?)\*/g, '$1')
          // 移除代码块符号
          .replace(/`(.*?)`/g, '$1')
          // 移除列表符号并转换为换行
          .replace(/^[\s]*[-*+]\s*/gm, '• ')
          // 移除多余的空行
          .replace(/\n{3,}/g, '\n\n')
          // 移除开头和结尾的空白
          .trim()
      }
      
      const parsedSections = parseSummaryContent(summaryContent)
      
      // 将总结内容解析成组件期望的结构
      const summaryData = {
        content: summaryContent,
        strategy: strategy,
        totalComments: totalComments,
        analyzedComments: selectedComments.length,
        generatedAt: new Date().toISOString(),
        // 使用解析后的分段内容，并清理markdown符号
        userLikes: cleanMarkdownText(parsedSections.userLikes),
        userDislikes: cleanMarkdownText(parsedSections.userDislikes),
        userExpectations: cleanMarkdownText(parsedSections.userExpectations),
        improvements: cleanMarkdownText(parsedSections.improvements),
        userProfile: cleanMarkdownText(parsedSections.userProfile)
      }
      
      setSummary(summaryData)
      
    } catch (error) {
      console.error('生成总结失败:', error)
      setError('生成总结失败：' + error.message)
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* 头部导航 */}
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          YouTube评论分析工具
        </h1>
        <p className="text-gray-600">
          采集视频评论，智能翻译，AI总结分析
        </p>
      </header>

      {/* 错误提示 */}
      {error && (
        <div className="max-w-6xl mx-auto mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError('')}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 输入区域 */}
        <CommentInput
          onStartProcess={handleStartProcess}
          isProcessing={isProcessing}
          videoUrl={videoUrl}
        />

        {/* 进度条 */}
        {isProcessing && (
          <ProgressBar
            progress={progress}
            onCancel={handleCancelProcess}
          />
        )}

        {/* 视频信息 */}
        {videoInfo && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card p-4">
              <h3 className="font-semibold text-lg mb-2">视频信息</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="space-y-2">
                  <p><span className="font-medium text-gray-800">标题:</span> {videoInfo.title}</p>
                  <p><span className="font-medium text-gray-800">作者:</span> {videoInfo.channelTitle}</p>
                  <p><span className="font-medium text-gray-800">发布时间:</span> {new Date(videoInfo.publishedAt).toLocaleDateString('zh-CN')}</p>
                </div>
                <div className="space-y-2">
                  <p><span className="font-medium text-gray-800">观看量:</span> {parseInt(videoInfo.viewCount || 0).toLocaleString()}</p>
                  <p><span className="font-medium text-gray-800">点赞数:</span> {parseInt(videoInfo.likeCount || 0).toLocaleString()}</p>
                  <p><span className="font-medium text-gray-800">评论数:</span> {parseInt(videoInfo.commentCount || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            {/* Excel导出 - 移到视频信息旁边 */}
            {comments.length > 0 && (
              <div className="lg:col-span-1">
                <ExcelExport
                  comments={comments}
                  videoInfo={videoInfo}
                />
              </div>
            )}
          </div>
        )}

        {/* 结果展示区域 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 评论列表 */}
          <div className="space-y-4">
            <CommentList comments={comments} />
          </div>

          {/* AI总结面板 */}
          <div>
            <SummaryPanel
              summary={summary}
              comments={comments}
              onGenerateSummary={handleGenerateSummary}
            />
          </div>
        </div>
      </div>

      {/* 底部信息 */}
      <footer className="text-center mt-12 py-6 text-sm text-gray-500 border-t">
        <p>请合理使用本工具，遵守YouTube服务条款</p>
        <p className="mt-1">数据仅供分析使用，不会存储到服务器</p>
        <p className="mt-1">本工具仅用于学习和研究目的</p>
      </footer>
    </main>
  )
}