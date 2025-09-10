import { retryApiCall, smartRetryApiCall, shouldRetryError } from '../apiRetry'

describe('apiRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('shouldRetryError', () => {
    it('should retry on 5xx errors', () => {
      const error = new Error('Server Error')
      error.response = { status: 500 }
      expect(shouldRetryError(error)).toBe(true)
    })

    it('should retry on 429 rate limit', () => {
      const error = new Error('Rate Limited')
      error.response = { status: 429 }
      expect(shouldRetryError(error)).toBe(true)
    })

    it('should retry on network errors', () => {
      const error = new Error('NETWORK_ERROR')
      expect(shouldRetryError(error)).toBe(true)
    })

    it('should not retry on 4xx client errors (except 429)', () => {
      const error = new Error('Bad Request')
      error.response = { status: 400 }
      expect(shouldRetryError(error)).toBe(false)
    })

    it('should not retry on 2xx success', () => {
      const error = new Error('Success')
      error.response = { status: 200 }
      expect(shouldRetryError(error)).toBe(false)
    })
  })

  describe('retryApiCall', () => {
    it('should return result on first success', async () => {
      const mockApiCall = jest.fn().mockResolvedValue('success')
      
      const result = await retryApiCall(mockApiCall, 3)
      
      expect(result).toBe('success')
      expect(mockApiCall).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const mockApiCall = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('success')
      
      const promise = retryApiCall(mockApiCall, 3)
      
      // Fast-forward through delays
      jest.runAllTimers()
      
      const result = await promise
      
      expect(result).toBe('success')
      expect(mockApiCall).toHaveBeenCalledTimes(3)
    })

    it('should fail after max retries', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('Always fails'))
      
      const promise = retryApiCall(mockApiCall, 2)
      
      // Fast-forward through delays
      jest.runAllTimers()
      
      await expect(promise).rejects.toThrow('Always fails')
      expect(mockApiCall).toHaveBeenCalledTimes(3) // initial + 2 retries
    })
  })

  describe('smartRetryApiCall', () => {
    it('should not retry non-retryable errors', async () => {
      const error = new Error('Bad Request')
      error.response = { status: 400 }
      const mockApiCall = jest.fn().mockRejectedValue(error)
      
      await expect(smartRetryApiCall(mockApiCall)).rejects.toThrow('Bad Request')
      expect(mockApiCall).toHaveBeenCalledTimes(1)
    })

    it('should retry retryable errors', async () => {
      const error = new Error('Server Error')
      error.response = { status: 500 }
      const mockApiCall = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success')
      
      const promise = smartRetryApiCall(mockApiCall)
      
      // Fast-forward through delays
      jest.runAllTimers()
      
      const result = await promise
      
      expect(result).toBe('success')
      expect(mockApiCall).toHaveBeenCalledTimes(2)
    })

    it('should respect custom options', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('NETWORK_ERROR'))
      
      const promise = smartRetryApiCall(mockApiCall, { maxRetries: 1 })
      
      // Fast-forward through delays
      jest.runAllTimers()
      
      await expect(promise).rejects.toThrow('NETWORK_ERROR')
      expect(mockApiCall).toHaveBeenCalledTimes(2) // initial + 1 retry
    })
  })
})