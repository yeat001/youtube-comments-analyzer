# 部署指南

## 本地开发

### 1. 环境准备
确保已安装 Node.js 18+ 和 npm

### 2. 克隆项目
```bash
git clone <repository-url>
cd youtube-comments-analyzer
```

### 3. 安装依赖
```bash
npm install
```

### 4. 环境变量配置
复制环境变量模板：
```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，填入实际的API Key：
```env
# YouTube Data API
YOUTUBE_API_KEY=your_youtube_api_key

# 翻译API
TRANSLATE_API_URL=your_translate_api_endpoint
TRANSLATE_API_KEY=your_translate_api_key

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key
```

### 5. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

## Vercel部署

### 1. 连接GitHub仓库
- 在 Vercel Dashboard 中点击 "New Project"
- 导入你的 GitHub 仓库
- 选择 "Next.js" 框架

### 2. 环境变量配置
在 Vercel 项目设置中添加环境变量：

| 变量名 | 值 | 说明 |
|--------|----|----|
| `YOUTUBE_API_KEY` | your_youtube_api_key | YouTube Data API密钥 |
| `TRANSLATE_API_URL` | your_translate_api_endpoint | 翻译API端点 |
| `TRANSLATE_API_KEY` | your_translate_api_key | 翻译API密钥 |
| `GEMINI_API_KEY` | your_gemini_api_key | Gemini AI密钥 |

### 3. 部署设置
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### 4. 域名配置（可选）
- 在 Vercel 项目设置中添加自定义域名
- 配置DNS记录指向Vercel

## API Keys 获取指南

### YouTube Data API Key
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 YouTube Data API v3
4. 创建凭据 > API 密钥
5. 限制API密钥使用范围（推荐）

### 翻译API
使用Google Translate API或其他翻译服务：
- Google Translate: https://cloud.google.com/translate/docs
- Azure Translator: https://azure.microsoft.com/services/cognitive-services/translator/
- 其他中转API服务

### Gemini AI API Key
1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 申请Gemini API访问权限
3. 创建API Key

## 故障排除

### 常见问题

**1. YouTube API配额不足**
- 检查Google Cloud Console中的API配额使用情况
- 考虑申请配额增加或分批处理

**2. 翻译API调用失败**
- 检查API Key和endpoint是否正确
- 检查API余额和请求限制

**3. Vercel函数超时**
- 默认超时时间为30分钟
- 可以考虑分批处理大量评论

**4. CORS错误**
- 确保API函数正确设置了CORS头
- 检查域名配置

### 性能优化建议

1. **评论数量限制**：建议单次处理不超过1万条评论
2. **API调用优化**：使用批量处理减少API调用次数
3. **缓存策略**：考虑对视频信息进行短期缓存
4. **错误处理**：实现重试机制和优雅降级

## 监控和维护

### 日志监控
- Vercel Functions 自带日志功能
- 关注API调用失败率和超时情况

### 成本控制
- 定期检查API使用量和费用
- 设置配额限制避免意外超支

### 更新维护
- 定期更新依赖包
- 关注API服务的变更公告
- 备份重要配置和数据

## 许可证
本项目使用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。