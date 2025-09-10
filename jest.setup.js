import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.YOUTUBE_API_KEY = 'test_youtube_api_key'
process.env.TRANSLATE_API_URL = 'https://test-translate-api.com'
process.env.TRANSLATE_API_KEY = 'test_translate_api_key'
process.env.GEMINI_API_KEY = 'test_gemini_api_key'

// Mock fetch globally
global.fetch = jest.fn()

// Mock window.URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url')
global.URL.revokeObjectURL = jest.fn()

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    readText: jest.fn(() => Promise.resolve('https://www.youtube.com/watch?v=test')),
    writeText: jest.fn(() => Promise.resolve()),
  },
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})