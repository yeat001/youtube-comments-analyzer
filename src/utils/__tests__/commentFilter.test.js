import { filterComments, getPopularComments, getRecentComments, categorizeCommentsBySentiment } from '../commentFilter'

describe('commentFilter', () => {
  const mockComments = [
    {
      id: '1',
      textDisplay: 'This is a great video!',
      authorDisplayName: 'User1',
      likeCount: 100,
      publishedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2', 
      textDisplay: '😊',
      authorDisplayName: 'User2',
      likeCount: 5,
      publishedAt: '2024-01-02T00:00:00Z'
    },
    {
      id: '3',
      textDisplay: 'Bad video, hate it',
      authorDisplayName: 'User3',
      likeCount: 50,
      publishedAt: '2024-01-03T00:00:00Z'
    },
    {
      id: '4',
      textDisplay: 'OK',
      authorDisplayName: 'User4',
      likeCount: 10,
      publishedAt: '2024-01-04T00:00:00Z'
    },
    {
      id: '5',
      textDisplay: 'This content is amazing and I love it so much!',
      authorDisplayName: 'User5',
      likeCount: 75,
      publishedAt: '2024-01-05T00:00:00Z'
    }
  ]

  describe('filterComments', () => {
    it('should filter out short comments', () => {
      const filtered = filterComments(mockComments)
      expect(filtered).not.toContain(expect.objectContaining({ id: '4' })) // 'OK' is too short
    })

    it('should filter out emoji-only comments', () => {
      const filtered = filterComments(mockComments)
      expect(filtered).not.toContain(expect.objectContaining({ id: '2' })) // '😊' is emoji only
    })

    it('should keep valid comments', () => {
      const filtered = filterComments(mockComments)
      expect(filtered).toContain(expect.objectContaining({ id: '1' }))
      expect(filtered).toContain(expect.objectContaining({ id: '3' }))
      expect(filtered).toContain(expect.objectContaining({ id: '5' }))
    })

    it('should handle empty array', () => {
      expect(filterComments([])).toEqual([])
    })

    it('should handle null input', () => {
      expect(filterComments(null)).toEqual([])
    })
  })

  describe('getPopularComments', () => {
    it('should sort comments by like count', () => {
      const popular = getPopularComments(mockComments, 3)
      expect(popular[0].likeCount).toBe(100)
      expect(popular[1].likeCount).toBe(75)
      expect(popular[2].likeCount).toBe(50)
    })

    it('should limit results', () => {
      const popular = getPopularComments(mockComments, 2)
      expect(popular).toHaveLength(2)
    })

    it('should handle empty array', () => {
      expect(getPopularComments([], 10)).toEqual([])
    })
  })

  describe('getRecentComments', () => {
    it('should sort comments by publish date', () => {
      const recent = getRecentComments(mockComments, 3)
      expect(recent[0].publishedAt).toBe('2024-01-05T00:00:00Z')
      expect(recent[1].publishedAt).toBe('2024-01-04T00:00:00Z')
      expect(recent[2].publishedAt).toBe('2024-01-03T00:00:00Z')
    })

    it('should limit results', () => {
      const recent = getRecentComments(mockComments, 2)
      expect(recent).toHaveLength(2)
    })
  })

  describe('categorizeCommentsBySentiment', () => {
    it('should categorize positive comments', () => {
      const categorized = categorizeCommentsBySentiment(mockComments)
      expect(categorized.positive).toContain(expect.objectContaining({ id: '1' }))
      expect(categorized.positive).toContain(expect.objectContaining({ id: '5' }))
    })

    it('should categorize negative comments', () => {
      const categorized = categorizeCommentsBySentiment(mockComments)
      expect(categorized.negative).toContain(expect.objectContaining({ id: '3' }))
    })

    it('should categorize neutral comments', () => {
      const categorized = categorizeCommentsBySentiment(mockComments)
      expect(categorized.neutral).toContain(expect.objectContaining({ id: '2' }))
      expect(categorized.neutral).toContain(expect.objectContaining({ id: '4' }))
    })

    it('should handle empty array', () => {
      const result = categorizeCommentsBySentiment([])
      expect(result).toEqual({
        positive: [],
        negative: [],
        neutral: []
      })
    })
  })
})