import { promises as fs } from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { GET, POST } from '../app/api/done/route'

const doc = 'checks/__vitest-done'
const dir = path.join(process.cwd(), 'data', doc)

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

function post(url: string, body: unknown): Request {
  return new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

describe('/api/done', () => {
  it('returns an empty list when done.json does not exist', async () => {
    const body = (await (await GET(new Request(`http://localhost/api/done?doc=${doc}-missing`))).json()) as { done: string[] }
    expect(body.done).toEqual([])
  })

  it('writes done.json in the per-check directory and reads it back', async () => {
    const written = await POST(post(`http://localhost/api/done?doc=${doc}`, { done: ['SINCE_PERFECT|use'] }))
    expect(written.status).toBe(200)
    const onDisk = JSON.parse(await fs.readFile(path.join(dir, 'done.json'), 'utf8')) as { done: string[] }
    expect(onDisk.done).toEqual(['SINCE_PERFECT|use'])

    const body = (await (await GET(new Request(`http://localhost/api/done?doc=${doc}`))).json()) as { done: string[] }
    expect(body.done).toEqual(['SINCE_PERFECT|use'])
  })

  it('rejects anything but a list of strings', async () => {
    expect((await POST(post(`http://localhost/api/done?doc=${doc}`, { done: [1] }))).status).toBe(400)
  })

  it('rejects a doc that escapes data/', async () => {
    expect((await GET(new Request('http://localhost/api/done?doc=../..'))).status).toBe(400)
    expect((await POST(post('http://localhost/api/done?doc=../..', { done: [] }))).status).toBe(400)
  })
})
