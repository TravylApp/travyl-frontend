import { describe, it, expect } from 'vitest'
import { handler } from './version'

describe('GET /api/version', () => {
  it('returns version info', async () => {
    const result = await handler({} as any, {} as any, () => {})
    expect(result.statusCode).toBe(200)

    const body = JSON.parse(result.body)
    expect(body.api.name).toBe('travyl-api')
    expect(body.api.version).toBe('v1')
    expect(body.environment).toBeDefined()
  })
})