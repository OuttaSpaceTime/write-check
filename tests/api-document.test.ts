import { promises as fs } from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { GET, POST } from '../app/api/document/route'

const doc = 'checks/__vitest-document'
const dir = path.join(process.cwd(), 'data', doc)

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

function post(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/document with a doc parameter', () => {
  it('writes and reads document.md inside the per-check directory', async () => {
    const written = await POST(post(`http://localhost/api/document?doc=${doc}`, { text: 'per-check text' }))
    expect(written.status).toBe(200)
    expect(await fs.readFile(path.join(dir, 'document.md'), 'utf8')).toBe('per-check text')

    const read = await GET(new Request(`http://localhost/api/document?doc=${doc}`))
    const body = (await read.json()) as { text: string }
    expect(body.text).toBe('per-check text')
  })

  it('rejects a doc that escapes data/', async () => {
    expect((await GET(new Request('http://localhost/api/document?doc=../..'))).status).toBe(400)
    expect((await POST(post('http://localhost/api/document?doc=../..', { text: 'nope' }))).status).toBe(400)
  })
})
