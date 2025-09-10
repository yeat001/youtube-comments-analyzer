#!/usr/bin/env node

// 项目结构验证脚本
const fs = require('fs')
const path = require('path')

const requiredFiles = [
  'package.json',
  'README.md',
  'DEPLOYMENT.md',
  'next.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'jest.config.js',
  'jest.setup.js',
  '.env.example',
  '.gitignore',
  'LICENSE',
  'src/app/layout.jsx',
  'src/app/page.jsx',
  'src/app/globals.css',
  'src/components/CommentInput.jsx',
  'src/components/ProgressBar.jsx',
  'src/components/CommentList.jsx',
  'src/components/SummaryPanel.jsx',
  'src/components/ExcelExport.jsx',
  'src/utils/videoUtils.js',
  'src/utils/commentFilter.js',
  'src/utils/excelGenerator.js',
  'src/utils/apiRetry.js',
  'src/utils/concurrencyManager.js',
  'src/hooks/useComments.js',
  'src/hooks/useProgress.js',
  'api/fetchComments.js',
  'api/translateText.js',
  'api/summarizeComments.js'
]

console.log('🔍 检查项目文件结构...\n')

let missingFiles = []
let existingFiles = []

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    existingFiles.push(file)
    console.log(`✅ ${file}`)
  } else {
    missingFiles.push(file)
    console.log(`❌ ${file}`)
  }
})

console.log(`\n📊 检查结果：`)
console.log(`✅ 存在文件: ${existingFiles.length}`)
console.log(`❌ 缺失文件: ${missingFiles.length}`)

if (missingFiles.length > 0) {
  console.log(`\n🚨 缺失的文件:`)
  missingFiles.forEach(file => console.log(`   - ${file}`))
  process.exit(1)
} else {
  console.log(`\n🎉 所有必需文件都已创建！`)
  console.log(`\n📝 下一步：`)
  console.log(`   1. 安装依赖: npm install`)
  console.log(`   2. 配置环境变量: cp .env.example .env.local`)
  console.log(`   3. 启动开发服务器: npm run dev`)
  process.exit(0)
}