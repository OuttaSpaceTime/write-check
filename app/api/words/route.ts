import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const file = path.join(process.cwd(), 'data', 'words.json')
    const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as { words?: unknown }
    const words = Array.isArray(parsed.words) ? parsed.words.filter(word => typeof word === 'string') : []
    return NextResponse.json({ words })
  } catch {
    return NextResponse.json({ words: [] })
  }
}
