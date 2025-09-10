'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { downloadExcelFile } from '../utils/excelGenerator'

export default function ExcelExport({ comments, videoInfo }) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  // 处理导出
  const handleExport = async () => {
    if (!comments || comments.length === 0) {
      setExportError('没有评论数据可以导出')
      return
    }

    setIsExporting(true)
    setExportError('')

    try {
      const filename = videoInfo?.title 
        ? `${videoInfo.title.replace(/[<>:"/\\|?*]/g, '_')}_评论数据`
        : 'youtube-comments'
      
      const exportedFilename = downloadExcelFile(comments, videoInfo, filename)
      
      // 可选：显示成功提示
      console.log(`文件已导出: ${exportedFilename}`)
      
    } catch (error) {
      console.error('导出失败:', error)
      setExportError(error.message || '导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  // 统计信息
  const stats = {
    total: comments?.length || 0,
    translated: comments?.filter(c => c.translatedText).length || 0,
  }

  if (!comments || comments.length === 0) {
    return (
      <div className="card p-4">
        <div className="text-center">
          <FileSpreadsheet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">暂无数据导出</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
          <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" />
          Excel导出
        </h3>
        <p className="text-gray-600 text-sm">
          导出 {stats.total} 条评论数据
        </p>
      </div>

      {/* 错误提示 */}
      {exportError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
          <div className="flex items-center text-red-800">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span>{exportError}</span>
          </div>
        </div>
      )}

      {/* 导出按钮 */}
      <button
        onClick={handleExport}
        disabled={isExporting || stats.total === 0}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
        <span>
          {isExporting ? '导出中...' : '导出Excel文件'}
        </span>
      </button>
    </div>
  )
}