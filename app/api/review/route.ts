import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

const REVIEW_PATH = path.join(process.cwd(), 'data', 'review.json')

export async function GET() {
  try {
    const [raw, stat] = await Promise.all([fs.readFile(REVIEW_PATH, 'utf8'), fs.stat(REVIEW_PATH)])
    const parsed = JSON.parse(raw) as unknown
    const notes = Array.isArray(parsed) ? parsed : ((parsed as { notes?: unknown }).notes ?? [])
    return NextResponse.json({ notes: Array.isArray(notes) ? notes : [], mtime: stat.mtimeMs })
  } catch {
    return NextResponse.json({ notes: [], mtime: 0 })
  }
}
