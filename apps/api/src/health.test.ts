import { describe, expect, it } from 'vitest'
import { app } from './server'

describe('health endpoint', () => {
  it('returns ok status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
  })
})
