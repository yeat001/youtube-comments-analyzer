/**
 * 带重试机制的API调用函数
 * @param {Function} apiCall - API调用函数
 * @param {number} maxRetries - 最大重试次数，默认3次
 * @param {number} retryDelay - 重试延迟时间（毫秒），默认1000ms
 * @returns {Promise} API调用结果
 */
export async function retryApiCall(apiCall, maxRetries = 3, retryDelay = 1000) {
  let lastError = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall()
      return result
    } catch (error) {
      lastError = error
      console.error(`API调用失败，第 ${attempt + 1} 次尝试:`, error.message)
      
      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) {
        throw error
      }
      
      // 计算退避延迟（指数退避）
      const delay = retryDelay * Math.pow(2, attempt)
      console.log(`等待 ${delay}ms 后重试...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

/**
 * 检查错误是否应该重试
 * @param {Error} error - 错误对象
 * @returns {boolean} 是否应该重试
 */
export function shouldRetryError(error) {
  // 网络错误、超时错误、5xx服务器错误应该重试
  const retryableErrors = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
    'UND_ERR_CONNECT_TIMEOUT', // 添加undici连接超时错误
    'ConnectTimeoutError', // 添加连接超时错误
    'fetch failed' // 添加fetch失败错误
  ]
  
  // HTTP状态码 5xx 应该重试
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return true
  }
  
  // 429 (Rate Limited) 应该重试
  if (error.response?.status === 429) {
    return true
  }
  
  // 检查错误类型和错误码
  const isRetryable = retryableErrors.some(errorType => 
    error.message?.includes(errorType) || 
    error.code === errorType ||
    error.name === errorType ||
    error.cause?.code === errorType ||
    error.cause?.name === errorType
  )
  
  // 特别检查连接超时错误
  if (error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
    return true
  }
  
  // 检查是否是fetch失败错误
  if (error.name === 'TypeError' && error.message === 'fetch failed') {
    return true
  }
  
  return isRetryable
}

/**
 * 智能重试机制 - 只对可重试的错误进行重试
 * @param {Function} apiCall - API调用函数
 * @param {Object} options - 重试选项
 * @returns {Promise} API调用结果
 */
export async function smartRetryApiCall(apiCall, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    jitter = true
  } = options
  
  let lastError = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall()
      return result
    } catch (error) {
      lastError = error
      
      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) {
        console.error(`API调用最终失败，已重试 ${maxRetries} 次:`, error.message)
        throw error
      }
      
      // 检查是否应该重试
      if (!shouldRetryError(error)) {
        console.error('错误不可重试，直接抛出:', error.message)
        throw error
      }
      
      console.error(`API调用失败，第 ${attempt + 1} 次尝试:`, error.message)
      
      // 计算延迟时间（指数退避 + 可选的随机抖动）
      let delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay)
      
      if (jitter) {
        // 添加随机抖动，避免所有请求同时重试
        delay = delay * (0.5 + Math.random() * 0.5)
      }
      
      console.log(`等待 ${Math.round(delay)}ms 后重试...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}