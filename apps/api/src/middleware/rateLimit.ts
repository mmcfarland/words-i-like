import { prisma } from '@words/db'

const DAILY_AI_LIMIT = 20

interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
}

export async function checkAiRateLimit(userId: string): Promise<RateLimitResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { allowed: false, remaining: 0, limit: DAILY_AI_LIMIT }
  }

  const now = new Date()
  const resetAt = new Date(user.dailyAiUsageResetAt)

  // Reset counter if a new day has started
  if (now.toDateString() !== resetAt.toDateString()) {
    await prisma.user.update({
      where: { id: userId },
      data: { dailyAiUsageCount: 0, dailyAiUsageResetAt: now },
    })
    return { allowed: true, remaining: DAILY_AI_LIMIT, limit: DAILY_AI_LIMIT }
  }

  if (user.dailyAiUsageCount >= DAILY_AI_LIMIT) {
    return { allowed: false, remaining: 0, limit: DAILY_AI_LIMIT }
  }

  return {
    allowed: true,
    remaining: DAILY_AI_LIMIT - user.dailyAiUsageCount,
    limit: DAILY_AI_LIMIT,
  }
}

export async function incrementAiUsage(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { dailyAiUsageCount: { increment: 1 } },
  })
}
