'use client'

import { useState, useMemo } from 'react'
import { MessageCircle, ThumbsUp, User, Calendar, ChevronDown, ChevronRight, Filter, Search } from 'lucide-react'

export default function CommentList({ comments }) {
  const [expandedComments, setExpandedComments] = useState(new Set())
  const [filterLevel, setFilterLevel] = useState('all') // all, main, replies
  const [sortBy, setSortBy] = useState('time') // time, likes, replies
  const [searchTerm, setSearchTerm] = useState('')
  const [showTranslated, setShowTranslated] = useState(true)

  // 过滤和排序评论
  const filteredAndSortedComments = useMemo(() => {
    if (!Array.isArray(comments)) return []

    let filtered = comments.filter(comment => {
      // 层级过滤
      if (filterLevel === 'main' && comment.level !== 0) return false
      if (filterLevel === 'replies' && comment.level !== 1) return false
      
      // 搜索过滤
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const originalText = (comment.textDisplay || '').toLowerCase()
        const translatedText = (comment.translatedText || '').toLowerCase()
        const authorName = (comment.authorDisplayName || '').toLowerCase()
        
        return originalText.includes(searchLower) || 
               translatedText.includes(searchLower) || 
               authorName.includes(searchLower)
      }
      
      return true
    })

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'likes':
          return (b.likeCount || 0) - (a.likeCount || 0)
        case 'replies':
          return (b.replyCount || 0) - (a.replyCount || 0)
        case 'time':
        default:
          return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
      }
    })

    return filtered
  }, [comments, filterLevel, sortBy, searchTerm])

  // 切换评论展开状态
  const toggleCommentExpanded = (commentId) => {
    const newExpanded = new Set(expandedComments)
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
    }
    setExpandedComments(newExpanded)
  }

  // 格式化时间
  const formatDate = (dateString) => {
    if (!dateString) return '未知时间'
    
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now - date
      
      const minutes = Math.floor(diff / (1000 * 60))
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const weeks = Math.floor(days / 7)
      const months = Math.floor(days / 30)
      const years = Math.floor(days / 365)
      
      if (minutes < 60) return `${minutes}分钟前`
      if (hours < 24) return `${hours}小时前`
      if (days < 7) return `${days}天前`
      if (weeks < 4) return `${weeks}周前`
      if (months < 12) return `${months}月前`
      return `${years}年前`
    } catch {
      return dateString.split('T')[0] // 返回日期部分
    }
  }

  // 统计信息
  const stats = useMemo(() => {
    if (!Array.isArray(comments)) return { total: 0, main: 0, replies: 0, translated: 0 }
    
    return {
      total: comments.length,
      main: comments.filter(c => c.level === 0).length,
      replies: comments.filter(c => c.level === 1).length,
      translated: comments.filter(c => c.translatedText).length
    }
  }, [comments])

  if (!comments || comments.length === 0) {
    return (
      <div className="card p-6 text-center">
        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">暂无评论数据</h3>
        <p className="text-gray-400">请先输入YouTube视频链接并开始采集</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 统计信息和控制栏 */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>共 {stats.total} 条评论</span>
            <span>主评论 {stats.main} 条</span>
            <span>回复 {stats.replies} 条</span>
            <span>已翻译 {stats.translated} 条</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTranslated(!showTranslated)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                showTranslated 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              显示翻译
            </button>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 搜索框 */}
          <div className="relative flex-1 min-w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索评论内容或用户名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 text-sm"
            />
          </div>

          {/* 层级过滤 */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">全部评论</option>
            <option value="main">主评论</option>
            <option value="replies">回复评论</option>
          </select>

          {/* 排序选择 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="time">按时间</option>
            <option value="likes">按点赞数</option>
            <option value="replies">按回复数</option>
          </select>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="space-y-3">
        {filteredAndSortedComments.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-gray-500">没有符合条件的评论</p>
          </div>
        ) : (
          filteredAndSortedComments.map((comment) => (
            <div
              key={comment.id}
              className={`card p-4 ${comment.level === 1 ? 'ml-8 border-l-4 border-primary-200' : ''}`}
            >
              {/* 评论头部信息 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {comment.authorDisplayName || '匿名用户'}
                    </span>
                    {comment.level === 1 && (
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                        回复
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(comment.publishedAt)}</span>
                    </div>

                    {(comment.likeCount || 0) > 0 && (
                      <div className="flex items-center space-x-1">
                        <ThumbsUp className="w-3 h-3" />
                        <span>{comment.likeCount}</span>
                      </div>
                    )}

                    {(comment.replyCount || 0) > 0 && comment.level === 0 && (
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>{comment.replyCount} 回复</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 展开/折叠按钮 */}
                <button
                  onClick={() => toggleCommentExpanded(comment.id)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {expandedComments.has(comment.id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>

              {/* 评论内容 */}
              <div className="space-y-2">
                {/* 原文 */}
                <div className={`text-gray-800 ${expandedComments.has(comment.id) ? '' : 'line-clamp-2'}`}>
                  {comment.textDisplay || '无内容'}
                </div>

                {/* 翻译文本 */}
                {showTranslated && comment.translatedText && (
                  <div className={`text-gray-600 bg-gray-50 p-3 rounded-lg border-l-4 border-green-200 ${expandedComments.has(comment.id) ? '' : 'line-clamp-2'}`}>
                    <div className="text-xs text-green-600 mb-1">中文翻译</div>
                    {comment.translatedText}
                  </div>
                )}

                {/* 截断提示 */}
                {!expandedComments.has(comment.id) && (comment.textDisplay || '').length > 100 && (
                  <button
                    onClick={() => toggleCommentExpanded(comment.id)}
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    展开更多
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 加载更多提示（如果需要分页） */}
      {filteredAndSortedComments.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            显示 {filteredAndSortedComments.length} / {stats.total} 条评论
          </p>
        </div>
      )}
    </div>
  )
}