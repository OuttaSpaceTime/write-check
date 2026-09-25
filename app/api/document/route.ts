import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { resolveDocPath } from '@/lib/docPath'

export async function GET(request: Request) {
  const documentFile = resolveDocPath(new URL(request.url).searchParams.get('doc'), 'document.md')
  if (!documentFile) {
    return NextResponse.json({ error: 'doc must stay inside data/' }, { status: 400 })
  }
  try {
    const [text, stat] = await Promise.all([fs.readFile(documentFile, 'utf8'), fs.stat(documentFile)])
    return NextResponse.json({ text: text.replace(/\r\n?/g, '\n'), mtime: stat.mtimeMs })
  } catch {
    return NextResponse.json({ text: '', mtime: 0 })
  }
}

export async function POST(request: Request) {
  const documentFile = resolveDocPath(new URL(request.url).searchParams.get('doc'), 'document.md')
  if (!documentFile) {
    return NextResponse.json({ error: 'doc must stay inside data/' }, { status: 400 })
  }
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
      const stat = await fs.stat(documentFile)
      if (stat.mtimeMs > body.baseMtime + 0.5) {
        const current = await fs.readFile(documentFile, 'utf8')
        if (current !== body.text) {
          return NextResponse.json({ text: current, mtime: stat.mtimeMs }, { status: 409 })
        }
      }
    } catch {}
  }
  await fs.mkdir(path.dirname(documentFile), { recursive: true })
  await fs.writeFile(documentFile, body.text, 'utf8')
  const stat = await fs.stat(documentFile)
  return NextResponse.json({ mtime: stat.mtimeMs })
}
