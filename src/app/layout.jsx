import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'YouTube评论采集与分析工具',
  description: '一个轻量化的前端工具，用于采集YouTube视频评论、自动翻译为中文、AI总结分析',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  )
}