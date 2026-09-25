import { promises as fs } from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { GET, POST } from '../app/api/cells/route'

const doc = 'checks/__vitest-cells'
const dir = path.join(process.cwd(), 'data', doc)

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

function post(url: string, body: unknown): Request {
  return new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

describe('/api/cells', () => {
  it('returns an empty layout when cells.json does not exist', async () => {
    const body = await (await GET(new Request(`http://localhost/api/cells?doc=${doc}-missing`))).json()
    expect(body).toEqual({ splits: [], joins: [] })
  })

  it('writes cells.json in the per-check directory and reads it back', async () => {
    const layout = { splits: ['They also cost less.'], joins: ['## Results'] }
    expect((await POST(post(`http://localhost/api/cells?doc=${doc}`, layout))).status).toBe(200)
    expect(JSON.parse(await fs.readFile(path.join(dir, 'cells.json'), 'utf8'))).toEqual(layout)
    expect(await (await GET(new Request(`http://localhost/api/cells?doc=${doc}`))).json()).toEqual(layout)
  })

  it('rejects anything but two lists of strings', async () => {
    expect((await POST(post(`http://localhost/api/cells?doc=${doc}`, { splits: 'x', joins: [] }))).status).toBe(400)
  })

  it('rejects a doc that escapes data/', async () => {
    expect((await GET(new Request('http://localhost/api/cells?doc=../..'))).status).toBe(400)
  })
})
