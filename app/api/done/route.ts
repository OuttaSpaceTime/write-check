import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { resolveDocPath } from '@/lib/docPath'

export async function GET(request: Request) {
  const doneFile = resolveDocPath(new URL(request.url).searchParams.get('doc'), 'done.json')
  if (!doneFile) {
    return NextResponse.json({ error: 'doc must stay inside data/' }, { status: 400 })
  }
  try {
    const parsed = JSON.parse(await fs.readFile(doneFile, 'utf8')) as { done?: unknown }
    return NextResponse.json({ done: isStringList(parsed.done) ? parsed.done : [] })
  } catch {
    return NextResponse.json({ done: [] })
  }
}

export async function POST(request: Request) {
  const doneFile = resolveDocPath(new URL(request.url).searchParams.get('doc'), 'done.json')
  if (!doneFile) {
    return NextResponse.json({ error: 'doc must stay inside data/' }, { status: 400 })
  }
  let body: { done?: unknown }
  try {
    body = (await request.json()) as { done?: unknown }
  } catch {
    return NextResponse.json({ error: 'request body must be JSON' }, { status: 400 })
  }
  if (!isStringList(body.done)) {
    return NextResponse.json({ error: 'done must be a list of strings' }, { status: 400 })
  }
  await fs.mkdir(path.dirname(doneFile), { recursive: true })
  await fs.writeFile(doneFile, JSON.stringify({ done: body.done }, null, 2), 'utf8')
  return NextResponse.json({ ok: true })
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(entry => typeof entry === 'string')
}
