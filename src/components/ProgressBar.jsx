'use client'

import { useEffect, useState } from 'react'
import { X, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

export default function ProgressBar({ progress, onCancel }) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState(null)

  // 更新时间显示
  useEffect(() => {
    if (!progress.startTime) return

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = now - progress.startTime
      setElapsedTime(elapsed)

      // 计算预计剩余时间
      if (progress.percentage > 0 && progress.percentage < 100) {
        const totalEstimated = (elapsed / progress.percentage) * 100
        const remaining = totalEstimated - elapsed
        setEstimatedTime(remaining > 0 ? remaining : 0)
      } else {
        setEstimatedTime(null)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [progress.startTime, progress.percentage])

  // 格式化时间显示
  const formatTime = (ms) => {
    if (!ms || ms < 0) return '00:00'
    
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
    } else {
      return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
    }
  }

  // 获取进度条颜色
  const getProgressColor = () => {
    if (progress.percentage >= 100) return 'bg-green-500'
    if (progress.percentage >= 75) return 'bg-primary-500'
    if (progress.percentage >= 50) return 'bg-blue-500'
    return 'bg-primary-500'
  }

  // 获取状态图标
  const getStatusIcon = () => {
    if (progress.percentage >= 100) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (progress.percentage > 0) {
      return (
        <div className="w-5 h-5">
          <div className="w-full h-full border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )
    } else {
      return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  if (!progress.stage) return null

  return (
    <div className="card p-4 border-l-4 border-primary-500">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-medium text-gray-900">{progress.stage}</h3>
            {progress.details && (
              <p className="text-sm text-gray-600">{progress.details}</p>
            )}
          </div>
        </div>
        
        <button
          onClick={onCancel}
          className="flex items-center space-x-1 text-gray-500 hover:text-red-600 text-sm px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
          title="取消操作"
        >
          <X className="w-4 h-4" />
          <span>取消</span>
        </button>
      </div>

      {/* 进度条 */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <div className="text-sm text-gray-600">
            {progress.total > 0 && (
              <span>{progress.current} / {progress.total}</span>
            )}
          </div>
          <div className="text-sm font-medium text-gray-700">
            {progress.percentage}%
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-300 ease-out`}
            style={{ width: `${Math.max(progress.percentage, 2)}%` }}
          >
            {progress.percentage > 0 && progress.percentage < 100 && (
              <div className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse-slow"></div>
            )}
          </div>
        </div>
      </div>

      {/* 时间信息 */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            已用时: {formatTime(elapsedTime)}
          </span>
          
          {estimatedTime !== null && progress.percentage > 0 && progress.percentage < 100 && (
            <span>
              预计剩余: {formatTime(estimatedTime)}
            </span>
          )}
        </div>
        
        {progress.percentage >= 100 && (
          <span className="flex items-center text-green-600">
            <CheckCircle className="w-4 h-4 mr-1" />
            已完成
          </span>
        )}
      </div>

      {/* 警告信息 */}
      {elapsedTime > 25 * 60 * 1000 && progress.percentage < 100 && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center text-yellow-800">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span className="text-sm">
              处理时间较长，将在30分钟后自动超时。建议取消并尝试处理评论较少的视频。
            </span>
          </div>
        </div>
      )}

      {/* 阶段详情 */}
      {progress.details && (
        <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
          {progress.details}
        </div>
      )}
    </div>
  )
}