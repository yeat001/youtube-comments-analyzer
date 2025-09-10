/**
 * 并发控制工具 - 确保同时只处理一个视频
 */

class ConcurrencyManager {
  constructor() {
    this.activeProcesses = new Set()
    this.maxConcurrent = 1 // 同时只能处理一个视频
  }

  /**
   * 检查是否可以开始新的处理
   * @param {string} processId - 进程标识符
   * @returns {boolean} 是否可以开始
   */
  canStart(processId) {
    if (this.activeProcesses.has(processId)) {
      return false // 该进程已经在运行
    }
    
    return this.activeProcesses.size < this.maxConcurrent
  }

  /**
   * 开始新的处理
   * @param {string} processId - 进程标识符
   * @returns {boolean} 是否成功开始
   */
  start(processId) {
    if (!this.canStart(processId)) {
      return false
    }
    
    this.activeProcesses.add(processId)
    console.log(`开始处理: ${processId}, 当前活跃进程数: ${this.activeProcesses.size}`)
    return true
  }

  /**
   * 结束处理
   * @param {string} processId - 进程标识符
   */
  finish(processId) {
    if (this.activeProcesses.has(processId)) {
      this.activeProcesses.delete(processId)
      console.log(`完成处理: ${processId}, 当前活跃进程数: ${this.activeProcesses.size}`)
    }
  }

  /**
   * 强制停止所有处理
   */
  clear() {
    this.activeProcesses.clear()
    console.log('清空所有活跃进程')
  }

  /**
   * 获取当前活跃的进程数
   * @returns {number} 活跃进程数
   */
  getActiveCount() {
    return this.activeProcesses.size
  }

  /**
   * 获取所有活跃的进程ID
   * @returns {Array<string>} 进程ID数组
   */
  getActiveProcesses() {
    return Array.from(this.activeProcesses)
  }

  /**
   * 检查特定进程是否正在运行
   * @param {string} processId - 进程标识符
   * @returns {boolean} 是否正在运行
   */
  isRunning(processId) {
    return this.activeProcesses.has(processId)
  }
}

// 全局并发管理器实例
const concurrencyManager = new ConcurrencyManager()

/**
 * 生成进程ID的工具函数
 * @param {string} videoId - 视频ID
 * @param {string} userId - 用户ID（可选，用于多用户场景）
 * @returns {string} 进程ID
 */
export function generateProcessId(videoId, userId = 'anonymous') {
  return `${userId}_${videoId}_${Date.now()}`
}

/**
 * 检查是否可以开始新的视频处理
 * @param {string} processId - 进程ID
 * @returns {boolean} 是否可以开始
 */
export function canStartVideoProcess(processId) {
  return concurrencyManager.canStart(processId)
}

/**
 * 开始视频处理
 * @param {string} processId - 进程ID
 * @returns {boolean} 是否成功开始
 */
export function startVideoProcess(processId) {
  return concurrencyManager.start(processId)
}

/**
 * 结束视频处理
 * @param {string} processId - 进程ID
 */
export function finishVideoProcess(processId) {
  concurrencyManager.finish(processId)
}

/**
 * 获取当前处理状态
 * @returns {Object} 状态信息
 */
export function getProcessingStatus() {
  return {
    activeCount: concurrencyManager.getActiveCount(),
    maxConcurrent: concurrencyManager.maxConcurrent,
    activeProcesses: concurrencyManager.getActiveProcesses(),
    canStartNew: concurrencyManager.getActiveCount() < concurrencyManager.maxConcurrent
  }
}

/**
 * 清空所有进程（用于错误恢复）
 */
export function clearAllProcesses() {
  concurrencyManager.clear()
}

/**
 * 装饰器函数：为API函数添加并发控制 (App Router版本)
 * @param {Function} apiFunction - 要控制并发的API函数
 * @returns {Function} 包装后的函数
 */
export function withConcurrencyControl(apiFunction) {
  return async function(req) {
    try {
      // 克隆请求以避免多次读取body的问题
      const body = await req.json()
      const { videoId } = body || {}
      
      if (!videoId) {
        return new Response(JSON.stringify({ error: '缺少视频ID参数' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // 生成进程ID
      const userId = req.headers.get('x-user-id') || 'anonymous'
      const processId = generateProcessId(videoId, userId)

      // 检查是否可以开始处理
      if (!canStartVideoProcess(processId)) {
        const status = getProcessingStatus()
        return new Response(JSON.stringify({ 
          error: '系统繁忙，请稍后再试',
          details: `当前有 ${status.activeCount} 个视频正在处理`,
          activeProcesses: status.activeProcesses.length,
          retryAfter: 30 // 建议30秒后重试
        }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // 开始处理
      if (!startVideoProcess(processId)) {
        return new Response(JSON.stringify({ error: '无法启动视频处理进程' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      try {
        // 创建新的请求对象传递给API函数，包含已解析的body
        const newReq = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify(body)
        })
        
        // 调用原始API函数
        const response = await apiFunction(newReq)
        return response
      } catch (error) {
        console.error(`进程 ${processId} 处理失败:`, error)
        return new Response(JSON.stringify({ error: '处理过程中发生错误: ' + error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      } finally {
        // 确保进程结束时清理
        finishVideoProcess(processId)
      }
    } catch (error) {
      console.error('并发控制器错误:', error)
      return new Response(JSON.stringify({ error: '服务器内部错误: ' + error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}

/**
 * Express中间件：添加并发控制和进程管理
 */
export function concurrencyMiddleware() {
  return (req, res, next) => {
    // 添加进程状态查询端点
    if (req.path === '/api/status' && req.method === 'GET') {
      return res.json(getProcessingStatus())
    }

    // 为响应对象添加进程完成回调
    const originalEnd = res.end
    res.end = function(...args) {
      if (req.processId) {
        finishVideoProcess(req.processId)
      }
      originalEnd.apply(this, args)
    }

    next()
  }
}