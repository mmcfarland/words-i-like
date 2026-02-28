import { describe, expect, it } from 'vitest'
import { buildApp } from './server'

describe('health endpoint', () => {
  it('returns ok status', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
    await app.close()
  })
})
