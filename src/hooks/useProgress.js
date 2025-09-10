import { useState, useCallback } from 'react'

/**
 * 进度管理Hook
 */
export function useProgress() {
  const [progress, setProgress] = useState({
    stage: '',           // 当前阶段描述
    percentage: 0,       // 完成百分比 (0-100)
    current: 0,          // 当前处理数量
    total: 0,            // 总数量
    startTime: null,     // 开始时间
    estimatedTime: null, // 预计完成时间
    details: null        // 额外详情
  })

  // 重置进度
  const resetProgress = useCallback(() => {
    setProgress({
      stage: '',
      percentage: 0,
      current: 0,
      total: 0,
      startTime: null,
      estimatedTime: null,
      details: null
    })
  }, [])

  // 开始新的进度跟踪
  const startProgress = useCallback((stage, total = 0, details = null) => {
    const startTime = Date.now()
    setProgress({
      stage,
      percentage: 0,
      current: 0,
      total,
      startTime,
      estimatedTime: null,
      details
    })
  }, [])

  // 更新进度
  const updateProgress = useCallback((updates) => {
    setProgress(prev => {
      const newProgress = { ...prev, ...updates }
      
      // 自动计算百分比（如果提供了current和total）
      if (newProgress.total > 0 && newProgress.current !== undefined) {
        newProgress.percentage = Math.round((newProgress.current / newProgress.total) * 100)
      }
      
      // 计算预计完成时间
      if (newProgress.startTime && newProgress.percentage > 0 && newProgress.percentage < 100) {
        const elapsed = Date.now() - newProgress.startTime
        const estimatedTotal = (elapsed / newProgress.percentage) * 100
        newProgress.estimatedTime = newProgress.startTime + estimatedTotal
      }
      
      return newProgress
    })
  }, [])

  // 设置当前进度值
  const setCurrent = useCallback((current, stage = null) => {
    updateProgress({ current, ...(stage && { stage }) })
  }, [updateProgress])

  // 增加当前进度值
  const incrementCurrent = useCallback((increment = 1, stage = null) => {
    setProgress(prev => {
      const newCurrent = prev.current + increment
      const updates = { current: newCurrent }
      
      if (stage) {
        updates.stage = stage
      }
      
      // 自动计算百分比
      if (prev.total > 0) {
        updates.percentage = Math.round((newCurrent / prev.total) * 100)
      }
      
      // 计算预计完成时间
      if (prev.startTime && updates.percentage > 0 && updates.percentage < 100) {
        const elapsed = Date.now() - prev.startTime
        const estimatedTotal = (elapsed / updates.percentage) * 100
        updates.estimatedTime = prev.startTime + estimatedTotal
      }
      
      return { ...prev, ...updates }
    })
  }, [])

  // 完成当前阶段
  const completeStage = useCallback((nextStage = null) => {
    const updates = { percentage: 100, current: progress.total }
    if (nextStage) {
      updates.stage = nextStage
      updates.percentage = 0
      updates.current = 0
    }
    updateProgress(updates)
  }, [progress.total, updateProgress])

  // 获取剩余时间（毫秒）
  const getRemainingTime = useCallback(() => {
    if (!progress.estimatedTime || progress.percentage >= 100) {
      return null
    }
    return Math.max(0, progress.estimatedTime - Date.now())
  }, [progress.estimatedTime, progress.percentage])

  // 获取已用时间（毫秒）
  const getElapsedTime = useCallback(() => {
    if (!progress.startTime) return 0
    return Date.now() - progress.startTime
  }, [progress.startTime])

  // 获取格式化的时间字符串
  const formatTime = useCallback((milliseconds) => {
    if (!milliseconds || milliseconds < 0) return '00:00'
    
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
    } else {
      return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
    }
  }, [])

  // 获取进度描述文本
  const getProgressText = useCallback(() => {
    if (!progress.stage) return ''
    
    let text = progress.stage
    
    if (progress.total > 0) {
      text += ` (${progress.current}/${progress.total})`
    }
    
    if (progress.percentage > 0) {
      text += ` - ${progress.percentage}%`
    }
    
    return text
  }, [progress])

  // 检查是否完成
  const isComplete = useCallback(() => {
    return progress.percentage >= 100
  }, [progress.percentage])

  // 检查是否正在进行
  const isInProgress = useCallback(() => {
    return progress.percentage > 0 && progress.percentage < 100
  }, [progress.percentage])

  return {
    progress,
    resetProgress,
    startProgress,
    updateProgress,
    setCurrent,
    incrementCurrent,
    completeStage,
    getRemainingTime,
    getElapsedTime,
    formatTime,
    getProgressText,
    isComplete,
    isInProgress
  }
}