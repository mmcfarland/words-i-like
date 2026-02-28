import { describe, expect, it, vi } from 'vitest'

// Mock prisma before importing module
const mockUser = {
  id: 'user-1',
  dailyAiUsageCount: 0,
  dailyAiUsageResetAt: new Date(),
}

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}

vi.mock('@words/db', () => ({
  prisma: mockPrisma,
}))

// Import after mocking
const { checkAiRateLimit, incrementAiUsage } = await import('./rateLimit')

describe('rate limiting', () => {
  it('allows request when under limit', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, dailyAiUsageCount: 5 })

    const result = await checkAiRateLimit('user-1')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(15)
    expect(result.limit).toBe(20)
  })

  it('rejects when at limit (20)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, dailyAiUsageCount: 20 })

    const result = await checkAiRateLimit('user-1')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('rejects 21st request', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, dailyAiUsageCount: 21 })

    const result = await checkAiRateLimit('user-1')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('resets counter on new day', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    mockPrisma.user.findUnique.mockResolvedValue({
      ...mockUser,
      dailyAiUsageCount: 20,
      dailyAiUsageResetAt: yesterday,
    })
    mockPrisma.user.update.mockResolvedValue({})

    const result = await checkAiRateLimit('user-1')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(20)
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ dailyAiUsageCount: 0 }),
      }),
    )
  })

  it('rejects when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const result = await checkAiRateLimit('nonexistent')
    expect(result.allowed).toBe(false)
  })

  it('increments usage count', async () => {
    mockPrisma.user.update.mockResolvedValue({})

    await incrementAiUsage('user-1')
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { dailyAiUsageCount: { increment: 1 } },
    })
  })
})
