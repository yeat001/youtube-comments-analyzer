'use client'

import { useState, useMemo, useCallback } from 'react'
import { BarChart3, Users, TrendingUp, Heart, MessageCircle, RefreshCw, Sparkles } from 'lucide-react'
import html2canvas from 'html2canvas'

export default function SummaryPanel({ summary, comments, onGenerateSummary }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState('full')

  // 清理和格式化文本内容的函数
  const formatSummaryText = (text) => {
    if (!text || typeof text !== 'string') return []
    
    // 将文本按行分割，并清理格式
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // 移除开头的数字编号 (如 "2. ", "3. " 等)
        line = line.replace(/^\d+\.\s*/, '')
        // 移除markdown列表符号
        line = line.replace(/^[-*+•]\s*/, '')
        // 移除markdown粗体符号
        line = line.replace(/\*\*(.*?)\*\*/g, '$1')
        // 移除markdown斜体符号
        line = line.replace(/\*(.*?)\*/g, '$1')
        // 移除维度标题重复 (如果有的话)
        line = line.replace(/^(用户喜好分析|用户不满分析|内容期待分析|视频优化建议|目标用户画像分析)\s*/, '')
        return line.trim()
      })
      .filter(line => line.length > 0 && !line.match(/^\d+\.?\s*$/)) // 过滤掉纯数字行
    
    return lines.length > 0 ? lines : []
  }

  // 总结策略配置
  const strategies = {
    full: { label: '全量总结', description: '基于所有评论的综合分析' },
    popular: { label: '热门评论', description: '基于点赞数最高的50条评论' },
    recent: { label: '最新评论', description: '基于最近100条评论' },
    positive: { label: '正面评论', description: '基于积极正面的评论' },
    negative: { label: '负面评论', description: '基于批评建议的评论' },
    neutral: { label: '中性评论', description: '基于客观中性的评论' }
  }

  // 评论统计
  const commentStats = useMemo(() => {
    if (!Array.isArray(comments) || comments.length === 0) {
      return null
    }

    const stats = {
      total: comments.length,
      mainComments: comments.filter(c => c.level === 0).length,
      replies: comments.filter(c => c.level === 1).length,
      totalLikes: comments.reduce((sum, c) => sum + (c.likeCount || 0), 0),
      avgLikes: 0,
      topComment: null,
      recentComments: 0,
      translatedCount: comments.filter(c => c.translatedText).length
    }

    if (stats.total > 0) {
      stats.avgLikes = Math.round(stats.totalLikes / stats.total)
      
      // 找到点赞最多的评论
      stats.topComment = comments.reduce((max, comment) => 
        (comment.likeCount || 0) > (max.likeCount || 0) ? comment : max
      )

      // 计算最近24小时的评论数
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      stats.recentComments = comments.filter(c => 
        c.publishedAt && new Date(c.publishedAt) > oneDayAgo
      ).length
    }

    return stats
  }, [comments])

  // 生成总结
  const generateSummary = useCallback(async (strategy = 'full') => {
    if (!comments || comments.length === 0 || !onGenerateSummary) return

    setIsGenerating(true)
    try {
      await onGenerateSummary(strategy)
    } catch (error) {
      console.error('生成总结失败:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [comments, onGenerateSummary])

  // PNG导出功能
  const exportToPNG = useCallback(async () => {
    if (!summary) return
    
    setIsExporting(true)
    try {
      const element = document.getElementById('summary-report')
      if (!element) {
        throw new Error('找不到总结报告元素')
      }

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // 高清输出
        useCORS: true,
        allowTaint: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0
      })

      // 创建下载链接
      const link = document.createElement('a')
      link.download = `YouTube评论分析报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      
      // 触发下载
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('PNG导出失败:', error)
      alert('导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }, [summary])

  // 如果没有评论数据
  if (!comments || comments.length === 0) {
    return (
      <div className="card p-6">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">等待数据</h3>
          <p className="text-gray-400">评论采集完成后，将在这里显示AI智能分析</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 统计概览卡片 */}
      {commentStats && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            数据概览
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-600">{commentStats.total}</div>
              <div className="text-sm text-gray-600">总评论数</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{commentStats.translatedCount}</div>
              <div className="text-sm text-gray-600">已翻译</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{commentStats.totalLikes}</div>
              <div className="text-sm text-gray-600">总点赞数</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{commentStats.recentComments}</div>
              <div className="text-sm text-gray-600">近24小时</div>
            </div>
          </div>

          {/* 热门评论预览 */}
          {commentStats.topComment && (
            <div className="border-t pt-3">
              <div className="text-sm font-medium text-gray-700 mb-2">热门评论</div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {commentStats.topComment.authorDisplayName}
                  </span>
                  <div className="flex items-center text-yellow-600">
                    <Heart className="w-4 h-4 mr-1" />
                    <span className="text-sm">{commentStats.topComment.likeCount}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {commentStats.topComment.translatedText || commentStats.topComment.textDisplay}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI总结面板 */}
      <div className="card">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-primary-600" />
              AI智能分析
            </h3>
            
            {/* 总结策略选择 */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="text-sm px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                disabled={isGenerating}
              >
                {Object.entries(strategies).map(([key, strategy]) => (
                  <option key={key} value={key}>
                    {strategy.label}
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => generateSummary(selectedStrategy)}
                disabled={isGenerating}
                className="btn-primary text-sm px-3 py-1 disabled:opacity-50 flex items-center space-x-1"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? '生成中...' : '生成总结'}</span>
              </button>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            {strategies[selectedStrategy].description}
          </p>
        </div>

        {/* 总结内容 */}
        <div className="p-4">
          {isGenerating ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : summary ? (
            <div id="summary-report" className="space-y-6">
              {/* 总结元信息 */}
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">{summary.totalComments}</div>
                    <div className="text-xs text-gray-600">总评论数</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{summary.analyzedComments}</div>
                    <div className="text-xs text-gray-600">分析评论数</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">{strategies[summary.strategy]?.label || '全量总结'}</div>
                    <div className="text-xs text-gray-600">分析策略</div>
                  </div>
                </div>
              </div>

              {/* 用户喜好分析 */}
              {summary.userLikes && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
                  <h4 className="font-semibold text-lg text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <Heart className="w-4 h-4 text-green-600" />
                    </div>
                    用户喜好分析
                  </h4>
                  <div className="space-y-3">
                    {formatSummaryText(summary.userLikes).length > 0 ? (
                      formatSummaryText(summary.userLikes).map((point, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-gray-700 leading-relaxed">{point}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-700 leading-relaxed">{summary.userLikes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 用户不满分析 */}
              {summary.userDislikes && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6 shadow-sm">
                  <h4 className="font-semibold text-lg text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <TrendingUp className="w-4 h-4 text-red-600" />
                    </div>
                    用户不满分析
                  </h4>
                  <div className="space-y-3">
                    {formatSummaryText(summary.userDislikes).length > 0 ? (
                      formatSummaryText(summary.userDislikes).map((point, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-gray-700 leading-relaxed">{point}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-700 leading-relaxed">{summary.userDislikes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 用户期待 */}
              {summary.userExpectations && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                  <h4 className="font-semibold text-lg text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <MessageCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    内容期待分析
                  </h4>
                  <div className="space-y-3">
                    {formatSummaryText(summary.userExpectations).length > 0 ? (
                      formatSummaryText(summary.userExpectations).map((point, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-gray-700 leading-relaxed">{point}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-700 leading-relaxed">{summary.userExpectations}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 优化建议 */}
              {summary.improvements && (
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6 shadow-sm">
                  <h4 className="font-semibold text-lg text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    视频优化建议
                  </h4>
                  <div className="space-y-3">
                    {formatSummaryText(summary.improvements).length > 0 ? (
                      formatSummaryText(summary.improvements).map((point, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-gray-700 leading-relaxed">{point}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-700 leading-relaxed">{summary.improvements}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 用户画像 */}
              {summary.userProfile && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6 shadow-sm">
                  <h4 className="font-semibold text-lg text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                      <Users className="w-4 h-4 text-indigo-600" />
                    </div>
                    目标用户画像分析
                  </h4>
                  <div className="space-y-3">
                    {formatSummaryText(summary.userProfile).length > 0 ? (
                      formatSummaryText(summary.userProfile).map((point, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-gray-700 leading-relaxed">{point}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-700 leading-relaxed">{summary.userProfile}</p>
                    )}
                  </div>
                </div>
              )}

              {/* PNG导出按钮 */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={exportToPNG}
                  disabled={isExporting}
                  className="btn-secondary px-6 py-2 flex items-center space-x-2 disabled:opacity-50"
                >
                  {isExporting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span>{isExporting ? '导出中...' : '导出PNG图片'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">点击"生成总结"开始AI分析</p>
              <p className="text-gray-400 text-sm mt-1">
                根据评论内容智能分析用户反馈和改进建议
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}