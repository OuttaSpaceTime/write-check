import { promises as fs } from 'fs'
import { NextResponse } from 'next/server'
import { resolveDocPath } from '@/lib/docPath'

export async function GET(request: Request) {
  const reviewFile = resolveDocPath(new URL(request.url).searchParams.get('doc'), 'review.json')
  if (!reviewFile) {
    return NextResponse.json({ error: 'doc must stay inside data/' }, { status: 400 })
  }
  try {
    const [raw, stat] = await Promise.all([fs.readFile(reviewFile, 'utf8'), fs.stat(reviewFile)])
    const parsed = JSON.parse(raw) as unknown
    const notes = Array.isArray(parsed) ? parsed : ((parsed as { notes?: unknown }).notes ?? [])
    return NextResponse.json({ notes: Array.isArray(notes) ? notes : [], mtime: stat.mtimeMs })
  } catch {
    return NextResponse.json({ notes: [], mtime: 0 })
  }
}
