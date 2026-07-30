import { describe, expect, it } from 'vitest'
import { POST } from '../app/api/check/route'

function request(body: string): Request {
  return new Request('http://localhost/api/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })
}

describe('POST /api/check validation', () => {
  it('rejects malformed JSON with 400', async () => {
    const response = await POST(request('{not json'))
    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain('JSON')
  })

  it('rejects an empty body with 400', async () => {
    const response = await POST(request(''))
    expect(response.status).toBe(400)
  })

  it('rejects a missing text field with 400', async () => {
    const response = await POST(request('{}'))
    expect(response.status).toBe(400)
  })

  it('rejects non-string text with 400', async () => {
    const response = await POST(request('{"text": 42}'))
    expect(response.status).toBe(400)
  })
})
