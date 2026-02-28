import type { FastifyInstance } from 'fastify'
import { checkAiRateLimit, incrementAiUsage } from '../middleware/rateLimit'
import { generateExamples } from '../services/ai'
import { wordService } from '../services/word'

export async function aiRoutes(app: FastifyInstance) {
  app.post('/words/:id/examples', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { userId } = request.user

    // Verify word exists and belongs to user
    const word = await wordService.getById(id, userId)
    if (!word) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Word not found',
        statusCode: 404,
      })
    }

    // Check rate limit
    const rateLimit = await checkAiRateLimit(userId)
    if (!rateLimit.allowed) {
      return reply.status(429).send({
        error: 'Rate Limit Exceeded',
        message: `Daily AI usage limit reached (${rateLimit.limit}/day). Try again tomorrow.`,
        statusCode: 429,
        remaining: 0,
        limit: rateLimit.limit,
      })
    }

    // Generate examples
    const result = await generateExamples(word.text)

    // Increment usage count
    await incrementAiUsage(userId)

    return {
      examples: result.examples,
      source: result.source,
      remaining: rateLimit.remaining - 1,
      limit: rateLimit.limit,
    }
  })
}
