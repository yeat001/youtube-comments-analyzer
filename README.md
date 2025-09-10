# YouTube评论采集与分析工具

一个轻量化的前端工具，用于采集YouTube视频/Shorts评论、自动翻译为中文、AI总结分析，并支持Excel导出和PNG图像导出。

## 📋 功能概述

### 核心功能
- **评论采集**: 获取YouTube视频和Shorts所有评论及子评论
- **智能翻译**: 自动翻译评论内容为中文（保留用户名和时间戳）
- **AI智能总结**: 多维度分析评论内容，生成用户画像和改进建议
- **Excel导出**: 一键导出翻译后的评论数据，保持层级关系
- **PNG图像导出**: 总结报告支持一键导出为精美PNG图片

### 特色功能
- **全格式支持**: 支持YouTube视频和Shorts短视频链接解析
- **多种总结策略**: 全量总结、热门评论、最新评论、情感分类总结
- **实时进度显示**: 采集/翻译/总结进度可视化
- **智能过滤**: 自动过滤短评论、纯表情及重复内容
- **并行处理**: 翻译完成后自动开始AI总结，提升效率
- **美观展示**: 总结报告采用彩色卡片布局，图文并茂
- **便捷导出**: Excel导出按钮位于显眼位置，无需滚动查找
- **容错处理**: 30分钟超时保护，失败自动重试

## 🚀 技术栈

- **前端**: React 18 + Tailwind CSS + Next.js 14
- **部署**: Vercel (前端直调API，无需服务器)
- **APIs**: YouTube Data API v3 + DeepSeek AI (翻译+总结)
- **数据处理**: xlsx库用于Excel导出，html2canvas用于PNG导出

## 📁 项目结构

```
youtube-comments-analyzer/
├── src/
│   ├── components/          # React组件
│   │   ├── CommentInput.jsx    # 视频链接输入
│   │   ├── ProgressBar.jsx     # 进度显示
│   │   ├── CommentList.jsx     # 评论列表展示
│   │   ├── SummaryPanel.jsx    # AI总结面板
│   │   ├── ExcelExport.jsx     # Excel导出
│   │   └── __tests__/          # 组件测试
│   ├── utils/               # 工具函数
│   │   ├── videoUtils.js       # 视频链接解析 (支持Shorts)
│   │   ├── commentFilter.js    # 评论过滤
│   │   ├── excelGenerator.js   # Excel生成
│   │   ├── apiRetry.js         # API重试机制
│   │   ├── concurrencyManager.js # 并发控制
│   │   └── __tests__/          # 工具函数测试
│   ├── hooks/               # 自定义Hook
│   │   ├── useComments.js      # 评论数据管理
│   │   └── useProgress.js      # 进度管理
│   └── app/                 # Next.js App Router
│       ├── layout.jsx          # 布局组件
│       ├── page.jsx            # 主页面
│       └── globals.css         # 全局样式
├── api/                     # Vercel Functions (废弃，现已前端直调)
│   ├── fetchComments.js        # YouTube API调用 (废弃)
│   ├── translateText.js        # 翻译API调用 (废弃)
│   └── summarizeComments.js    # AI总结调用 (废弃)
├── scripts/                 # 脚本文件
│   └── check-structure.js      # 项目结构检查
├── public/                  # 静态资源
├── package.json             # 项目配置
├── next.config.js           # Next.js配置
├── tailwind.config.js       # Tailwind配置
├── jest.config.js           # Jest测试配置
└── vercel.json              # Vercel部署配置
```

## 🔧 环境配置

### 环境变量设置
在本地开发时需要设置以下环境变量：

```env
# YouTube Data API
YOUTUBE_API_KEY=your_youtube_api_key

# DeepSeek AI API (翻译+总结)
DEEPSEEK_API_KEY=your_deepseek_api_key
```

**注意**: 当前版本为前端直调API模式，API密钥直接写在代码中，仅适用于学习和测试。生产环境请使用环境变量或安全的密钥管理服务。

### 本地开发
```bash
# 克隆项目
git clone <repository-url>
cd youtube-comments-analyzer

# 安装依赖
npm install

# 创建.env.local文件并配置环境变量
cp .env.example .env.local

# 启动开发服务器
npm run dev
```

## 💻 使用流程

### 1. 输入视频链接
- 支持多种YouTube链接格式:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/embed/VIDEO_ID`
  - `https://www.youtube.com/shorts/VIDEO_ID` **（新增支持）**
  - `https://youtube.com/shorts/VIDEO_ID` **（新增支持）**

### 2. 自动处理流程
- 点击"开始采集"按钮
- **阶段1**: 采集评论 - 实时显示采集进度
- **阶段2**: 智能翻译 - 采集完成后自动开始翻译
- **阶段3**: AI总结 - 翻译完成后自动生成全量总结
- 全程支持中途取消操作

### 3. 查看结果
- **翻译结果**: 实时显示翻译后的评论
- **AI总结**: 图文并茂的多维度分析报告
  - 用户喜好分析
  - 用户不满分析  
  - 内容期待分析
  - 视频优化建议
  - 目标用户画像分析

### 4. 导出数据
- **Excel导出**: 一键生成完整评论数据表格（位于视频信息旁边，便于快速访问）
- **PNG导出**: 将总结报告导出为精美图片
- 包含完整层级关系和翻译结果

## 📊 Excel导出格式

### Sheet1: 评论数据
| 评论ID | 原文 | 中文翻译 | 点赞数 | 回复数 | 用户名 | 时间 | 层级 | 父评论ID |
|--------|------|----------|--------|--------|--------|------|------|----------|
| ABC123 | Great video! | 很棒的视频！ | 156 | 3 | @UserA | 2024-01-01 | 0 | null |
| DEF456 | I agree | 我同意 | 12 | 0 | @UserB | 2024-01-02 | 1 | ABC123 |

**字段说明:**
- **层级**: 0=主评论, 1=回复评论
- **父评论ID**: 用于追溯评论层级关系

## 🎯 AI总结功能 (由DeepSeek提供)

### 自动化流程
- **智能触发**: 翻译完成后自动开始全量总结
- **快速处理**: 平均处理时间缩短至1-2分钟  
- **美观展示**: 采用卡片式布局，图文并茂
- **PNG导出**: 支持一键导出总结报告为高质量图片

### 总结策略

### 1. 全量总结 (默认自动生成)
- 基于所有有效评论的综合分析
- 提供整体用户反馈趋势
- 翻译完成后自动触发

### 2. 热门评论总结
- 基于点赞数排序的TOP 50评论
- 反映最受认可的观点

### 3. 最新评论总结
- 基于最近100条评论
- 反映当前用户反馈趋势

### 4. 情感分类总结
- **正面评论**: 用户喜欢的内容点
- **负面评论**: 用户不满和改进建议
- **中性评论**: 客观评价和建议

### 总结报告格式优化
- **结构化展示**: 五大维度分析，层次清晰
- **数据可视化**: 关键数据用卡片高亮显示
- **图标美化**: 每个维度配有相应图标
- **颜色区分**: 不同类型内容用不同背景色区分
- **PNG导出**: 保持格式美观，适合分享和存档

## ⚡ 性能优化

### API调用优化
- **分页获取**: 每次获取100条评论，避免超时
- **批量翻译**: 每批处理10条评论，提高效率
- **并行处理**: 翻译和总结并行进行，缩短总时长
- **前端直调**: 绕过服务器，直接在浏览器调用API，提升稳定性

### 容错机制
- **30分钟超时**: 防止长时间卡死
- **智能重试**: API调用失败自动重试3次，使用指数退避策略
- **并发控制**: 同时只能处理一个视频，避免资源冲突
- **中途取消**: 随时停止并保存已处理数据

### 数据质量控制
```javascript
// 评论过滤规则
const filterRules = {
  minLength: 5,           // 最少5个字符
  noEmojiOnly: true,      // 排除纯表情评论
  noDuplicate: true       // 去除重复评论
}
```

## 🔒 安全考虑

- **API Key安全**: 所有敏感信息存储在Vercel环境变量
- **输入验证**: 严格验证YouTube链接格式
- **数据隐私**: 不存储用户数据，仅在内存中处理
- **CORS处理**: 通过Vercel Functions避免跨域问题

## 📈 使用限制

### API配额限制
- **YouTube API**: 每日10,000单位配额
- **DeepSeek API**: 按实际使用量计费，支持高并发

### 性能限制
- **单视频处理**: 建议不超过1万条评论
- **处理时长**: 评论采集+翻译+总结总计约3-5分钟
- **自动化流程**: 翻译完成后自动生成总结，无需手动操作

## 🔧 自定义配置

### 修改过滤规则
```javascript
// src/utils/commentFilter.js
export const filterConfig = {
  minTextLength: 5,        // 可调整最小字符数
  maxTextLength: 1000,     // 可调整最大字符数
  filterEmojis: true,      // 是否过滤纯表情
  filterRepeated: true     // 是否去重
}
```

### 自定义AI总结Prompt
```javascript
// src/app/page.jsx - handleGenerateSummary函数
const customPrompt = `
请分析以下YouTube评论，从这些维度总结：
1. 用户喜好分析 - 用户最欣赏的内容特点和亮点
2. 用户不满分析 - 用户主要抱怨和不满的问题点  
3. 内容期待分析 - 用户希望看到更多的内容类型
4. 视频优化建议 - 基于评论反馈的具体改进建议
5. 目标用户画像分析 - 主要观众群体特征分析
`;
```

## 🎨 即将推出的功能

### 1. 自动总结优化
- ✅ **翻译完成后自动总结**: 无需手动点击，提升用户体验
- 🔄 **总结速度优化**: 目标处理时间缩短至1-2分钟
- 🔄 **格式美化**: 采用卡片式布局，图文并茂展示

### 2. PNG导出功能
- 🔄 **一键导出**: 将总结报告导出为高质量PNG图片
- 🔄 **美观设计**: 保持原有格式和色彩，适合分享
- 🔄 **多种尺寸**: 支持社交媒体适配的不同尺寸

### 3. 界面优化
- 🔄 **总结格式重构**: 解决当前格式混乱问题
- 🔄 **数据可视化**: 添加图表和数据卡片
- 🔄 **响应式设计**: 优化移动端显示效果

## 🚀 部署指南

### Vercel部署 (推荐)
1. Fork项目到你的GitHub
2. 在Vercel中导入项目  
3. 部署完成后，工具已可使用 (API密钥已内置)
4. 可选：配置自定义域名

### 本地部署
```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

**注意**: 当前版本所有API调用都在前端进行，部署后即可直接使用，无需额外配置服务器环境变量。

### 域名配置
- 支持自定义域名绑定
- 自动HTTPS证书
- 全球CDN加速

## 🤝 贡献指南

欢迎提交Issue和Pull Request来完善这个项目！

### 开发规范
- 使用ESLint + Prettier代码格式化
- 提交前请运行测试: `npm test`
- 运行测试覆盖率: `npm run test:coverage`
- 遵循Conventional Commits提交规范

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 📝 更新日志

### v2.1.0 (当前版本)
- ✅ **YouTube Shorts支持**: 新增对Shorts短视频链接的解析支持
- ✅ **总结格式优化**: 五个分析维度分别用不同颜色卡片展示，视觉层次更清晰
- ✅ **列表样式美化**: 每个分析要点用彩色圆点标识，排版更美观
- ✅ **内容清理优化**: 自动清理markdown符号和数字编号，显示更干净
- ✅ **外语翻译增强**: AI总结中的外语评论自动翻译成中文显示
- ✅ **速度性能提升**: 优化处理算法，总结生成时间缩短至2-3分钟
- ✅ **导出位置优化**: Excel导出按钮移至视频信息旁边，避免滚动查找
- ✅ **界面简化**: 精简导出组件，移除冗余信息，突出核心功能

### v2.0.0
- ✅ **架构重构**: 从服务端API调用改为前端直调，提升稳定性
- ✅ **AI服务切换**: 翻译和总结全部切换为DeepSeek API
- ✅ **自动化流程**: 翻译完成后自动开始AI总结
- ✅ **过滤优化**: 使用专业的评论过滤算法
- ✅ **翻译质量提升**: 优化提示词，提高翻译准确性和简洁性

### v1.0.0 (已废弃)
- ❌ **服务端架构**: 使用Vercel Functions处理API调用
- ❌ **多API混合**: YouTube + Google Translate + Gemini AI
- ❌ **手动操作**: 需要手动点击生成总结

**注意**: 使用本工具需要遵守YouTube服务条款和各API服务商的使用协议。请合理使用，避免过度请求。本工具仅供学习和研究使用。