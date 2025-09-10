import { extractVideoId, isValidYouTubeUrl, formatYouTubeUrl, getYouTubeThumbnail } from '../videoUtils'

describe('videoUtils', () => {
  describe('extractVideoId', () => {
    it('should extract video ID from standard YouTube URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      expect(extractVideoId(url)).toBe('dQw4w9WgXcQ')
    })

    it('should extract video ID from short YouTube URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ'
      expect(extractVideoId(url)).toBe('dQw4w9WgXcQ')
    })

    it('should extract video ID from embed URL', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      expect(extractVideoId(url)).toBe('dQw4w9WgXcQ')
    })

    it('should return null for invalid URLs', () => {
      expect(extractVideoId('https://example.com')).toBeNull()
      expect(extractVideoId('')).toBeNull()
      expect(extractVideoId(null)).toBeNull()
    })

    it('should handle URLs with additional parameters', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&list=PLx'
      expect(extractVideoId(url)).toBe('dQw4w9WgXcQ')
    })
  })

  describe('isValidYouTubeUrl', () => {
    it('should validate correct YouTube URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
      expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
      expect(isValidYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(isValidYouTubeUrl('https://example.com')).toBe(false)
      expect(isValidYouTubeUrl('')).toBe(false)
      expect(isValidYouTubeUrl('not a url')).toBe(false)
    })
  })

  describe('formatYouTubeUrl', () => {
    it('should format video ID to standard YouTube URL', () => {
      const expected = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      expect(formatYouTubeUrl('dQw4w9WgXcQ')).toBe(expected)
    })
  })

  describe('getYouTubeThumbnail', () => {
    it('should generate thumbnail URL with default quality', () => {
      const expected = 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
      expect(getYouTubeThumbnail('dQw4w9WgXcQ')).toBe(expected)
    })

    it('should generate thumbnail URL with high quality', () => {
      const expected = 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
      expect(getYouTubeThumbnail('dQw4w9WgXcQ', 'high')).toBe(expected)
    })

    it('should fallback to medium quality for invalid quality param', () => {
      const expected = 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
      expect(getYouTubeThumbnail('dQw4w9WgXcQ', 'invalid')).toBe(expected)
    })
  })
})