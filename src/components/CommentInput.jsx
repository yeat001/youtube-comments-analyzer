'use client'

import { useState } from 'react'
import { extractVideoId, isValidYouTubeUrl } from '../utils/videoUtils'
import { PlayCircle, AlertCircle } from 'lucide-react'

export default function CommentInput({ onStartProcess, isProcessing, videoUrl }) {
  const [inputUrl, setInputUrl] = useState('')
  const [error, setError] = useState('')

  const handleInputChange = (e) => {
    const url = e.target.value
    setInputUrl(url)
    
    // 清除之前的错误
    if (error) setError('')
    
    // 实时验证URL（只在有输入时验证）
    if (url.trim() && !isValidYouTubeUrl(url)) {
      setError('请输入有效的YouTube视频链接')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const url = inputUrl.trim()
    if (!url) {
      setError('请输入YouTube视频链接')
      return
    }

    if (!isValidYouTubeUrl(url)) {
      setError('请输入有效的YouTube视频链接')
      return
    }

    const videoId = extractVideoId(url)
    if (!videoId) {
      setError('无法从链接中提取视频ID')
      return
    }

    setError('')
    onStartProcess(url)
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setInputUrl(text)
      
      // 清除错误并验证
      setError('')
      if (!isValidYouTubeUrl(text)) {
        setError('剪贴板中的内容不是有效的YouTube链接')
      }
    } catch (err) {
      setError('无法读取剪贴板内容')
    }
  }

  const handleClear = () => {
    setInputUrl('')
    setError('')
  }

  // 示例链接
  const exampleLinks = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ'
  ]

  return (
    <div className="card p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
          <PlayCircle className="w-6 h-6 mr-2 text-primary-600" />
          输入视频链接
        </h2>
        <p className="text-gray-600 text-sm">
          支持多种YouTube链接格式，粘贴链接后点击开始采集
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="url"
            value={inputUrl}
            onChange={handleInputChange}
            placeholder="粘贴YouTube视频链接，例如: https://www.youtube.com/watch?v=..."
            className={`input-field pr-20 ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
            disabled={isProcessing}
          />
          
          {/* 输入框内的操作按钮 */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
            {inputUrl && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 text-sm px-2 py-1 rounded"
                disabled={isProcessing}
              >
                清空
              </button>
            )}
            <button
              type="button"
              onClick={handlePaste}
              className="text-primary-600 hover:text-primary-700 text-sm px-2 py-1 rounded"
              disabled={isProcessing}
            >
              粘贴
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="flex items-center text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mr-1" />
            {error}
          </div>
        )}

        {/* 示例链接 */}
        <div className="text-sm">
          <p className="text-gray-500 mb-2">支持的链接格式:</p>
          <div className="space-y-1">
            {exampleLinks.map((link, index) => (
              <div key={index} className="text-gray-400 font-mono text-xs">
                {link}
              </div>
            ))}
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={isProcessing || !inputUrl.trim() || !!error}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {isProcessing ? '处理中...' : '开始采集评论'}
          </button>
          
          {/* 当前状态指示 */}
          {videoUrl && (
            <div className="flex items-center text-sm text-gray-500 px-3">
              {isProcessing ? (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse mr-2"></div>
                  处理中
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  已完成
                </div>
              )}
            </div>
          )}
        </div>
      </form>

      {/* 使用提示 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">使用说明:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 支持所有公开的YouTube视频</li>
          <li>• 自动采集视频的所有评论和回复</li>
          <li>• 过滤掉5字符以内和纯表情评论</li>
          <li>• 处理时间取决于评论数量，大约需要几分钟</li>
          <li>• 可以随时取消操作并导出已处理部分</li>
        </ul>
      </div>
    </div>
  )
}