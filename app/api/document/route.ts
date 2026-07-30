import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

const DOCUMENT_PATH = path.join(process.cwd(), 'data', 'document.md')

export async function GET() {
  try {
    const [text, stat] = await Promise.all([fs.readFile(DOCUMENT_PATH, 'utf8'), fs.stat(DOCUMENT_PATH)])
    return NextResponse.json({ text, mtime: stat.mtimeMs })
  } catch {
    return NextResponse.json({ text: '', mtime: 0 })
  }
}

export async function POST(request: Request) {
  let body: { text?: unknown; baseMtime?: unknown; force?: unknown }
  try {
    body = (await request.json()) as { text?: unknown; baseMtime?: unknown; force?: unknown }
  } catch {
    return NextResponse.json({ error: 'request body must be JSON' }, { status: 400 })
  }
  if (typeof body.text !== 'string') {
    return NextResponse.json({ error: 'text must be a string' }, { status: 400 })
  }
  if (body.force !== true && typeof body.baseMtime === 'number') {
    try {
      const stat = await fs.stat(DOCUMENT_PATH)
      if (stat.mtimeMs > body.baseMtime + 0.5) {
        const current = await fs.readFile(DOCUMENT_PATH, 'utf8')
        if (current !== body.text) {
          return NextResponse.json({ text: current, mtime: stat.mtimeMs }, { status: 409 })
        }
      }
    } catch {}
  }
  await fs.mkdir(path.dirname(DOCUMENT_PATH), { recursive: true })
  await fs.writeFile(DOCUMENT_PATH, body.text, 'utf8')
  const stat = await fs.stat(DOCUMENT_PATH)
  return NextResponse.json({ mtime: stat.mtimeMs })
}
