import type { FastifyInstance } from 'fastify'
import { checkAiRateLimit, incrementAiUsage } from '../middleware/rateLimit.js'
import { generateExamples } from '../services/ai.js'
import { wordService } from '../services/word.js'

export async function aiRoutes(app: FastifyInstance) {
  app.post('/words/:id/examples', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { text } = (request.body ?? {}) as { text?: string }
    const { userId } = request.user

    // Prefer server word lookup, but allow client text fallback for local-only IDs.
    const word = await wordService.getById(id, userId)
    const targetText = word?.text ?? text?.trim()
    if (!targetText) {
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

    try {
      // Generate examples
      const result = await generateExamples(targetText)

      // Increment usage count
      await incrementAiUsage(userId)

      return {
        examples: result.examples,
        source: result.source,
        remaining: rateLimit.remaining - 1,
        limit: rateLimit.limit,
      }
    }
    catch (error) {
      request.log.error({ err: error, userId, wordId: id }, 'AI example generation failed')
      return reply.status(503).send({
        error: 'Service Unavailable',
        message: 'AI examples are temporarily unavailable. Please try again later.',
        statusCode: 503,
      })
    }
  })
}
