import { useState, useCallback, useRef } from 'react'

/**
 * 评论数据管理Hook
 */
export function useComments() {
  const [comments, setComments] = useState([])
  const [videoInfo, setVideoInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)

  // 重置状态
  const reset = useCallback(() => {
    setComments([])
    setVideoInfo(null)
    setError(null)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  // 获取评论数据
  const fetchComments = useCallback(async (videoId, onProgress) => {
    setIsLoading(true)
    setError(null)
    setComments([])
    
    // 创建新的AbortController
    abortControllerRef.current = new AbortController()

    try {
      // 调用API获取评论
      const response = await fetch('/api/fetchComments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留最后一个不完整的行

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line)
              
              if (data.type === 'progress') {
                onProgress?.(data.progress)
              } else if (data.type === 'videoInfo') {
                setVideoInfo(data.data)
              } else if (data.type === 'comments') {
                setComments(prev => [...prev, ...data.data])
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (parseError) {
              console.error('解析响应数据失败:', parseError)
            }
          }
        }
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('请求已取消')
      } else {
        console.error('获取评论失败:', error)
        setError(error.message)
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [])

  // 翻译评论
  const translateComments = useCallback(async (commentsToTranslate, onProgress) => {
    if (!Array.isArray(commentsToTranslate) || commentsToTranslate.length === 0) {
      return []
    }

    setIsLoading(true)
    setError(null)

    // 创建新的AbortController
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/translateText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: commentsToTranslate }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const translatedComments = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line)
              
              if (data.type === 'progress') {
                onProgress?.(data.progress)
              } else if (data.type === 'translated') {
                translatedComments.push(...data.data)
                // 更新comments状态中对应的评论
                setComments(prev => prev.map(comment => {
                  const translated = data.data.find(t => t.id === comment.id)
                  return translated ? { ...comment, translatedText: translated.translatedText } : comment
                }))
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (parseError) {
              console.error('解析翻译响应失败:', parseError)
            }
          }
        }
      }

      return translatedComments

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('翻译请求已取消')
      } else {
        console.error('翻译评论失败:', error)
        setError(error.message)
      }
      return []
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [])

  // 取消当前操作
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsLoading(false)
  }, [])

  // 添加评论（用于实时更新）
  const addComments = useCallback((newComments) => {
    if (Array.isArray(newComments)) {
      setComments(prev => [...prev, ...newComments])
    }
  }, [])

  // 更新评论（用于翻译后更新）
  const updateComment = useCallback((commentId, updates) => {
    setComments(prev => prev.map(comment => 
      comment.id === commentId ? { ...comment, ...updates } : comment
    ))
  }, [])

  // 获取评论统计
  const getStats = useCallback(() => {
    return {
      total: comments.length,
      mainComments: comments.filter(c => c.level === 0).length,
      replies: comments.filter(c => c.level === 1).length,
      translated: comments.filter(c => c.translatedText).length,
      totalLikes: comments.reduce((sum, c) => sum + (c.likeCount || 0), 0)
    }
  }, [comments])

  return {
    comments,
    videoInfo,
    isLoading,
    error,
    fetchComments,
    translateComments,
    cancel,
    reset,
    addComments,
    updateComment,
    setVideoInfo,
    getStats
  }
}