import { promises as fs } from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { GET } from '../app/api/review/route'

const doc = 'checks/__vitest-review'
const dir = path.join(process.cwd(), 'data', doc)

afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('/api/review with a doc parameter', () => {
  it('reads review.json from the per-check directory', async () => {
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(
      path.join(dir, 'review.json'),
      JSON.stringify({ notes: [{ title: 'Scoped note', message: 'Only in this check' }] }),
      'utf8'
    )

    const response = await GET(new Request(`http://localhost/api/review?doc=${doc}`))
    const body = (await response.json()) as { notes: { title: string }[] }
    expect(body.notes.map(note => note.title)).toEqual(['Scoped note'])
  })

  it('rejects a doc that escapes data/', async () => {
    expect((await GET(new Request('http://localhost/api/review?doc=../..'))).status).toBe(400)
  })
})
