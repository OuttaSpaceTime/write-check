import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { resolveDocPath } from '@/lib/docPath'

export async function GET(request: Request) {
  const cellsFile = resolveDocPath(new URL(request.url).searchParams.get('doc'), 'cells.json')
  if (!cellsFile) {
    return NextResponse.json({ error: 'doc must stay inside data/' }, { status: 400 })
  }
  try {
    const parsed = JSON.parse(await fs.readFile(cellsFile, 'utf8')) as { splits?: unknown; joins?: unknown }
    return NextResponse.json({
      splits: isStringList(parsed.splits) ? parsed.splits : [],
      joins: isStringList(parsed.joins) ? parsed.joins : [],
    })
  } catch {
    return NextResponse.json({ splits: [], joins: [] })
  }
}

export async function POST(request: Request) {
  const cellsFile = resolveDocPath(new URL(request.url).searchParams.get('doc'), 'cells.json')
  if (!cellsFile) {
    return NextResponse.json({ error: 'doc must stay inside data/' }, { status: 400 })
  }
  let body: { splits?: unknown; joins?: unknown }
  try {
    body = (await request.json()) as { splits?: unknown; joins?: unknown }
  } catch {
    return NextResponse.json({ error: 'request body must be JSON' }, { status: 400 })
  }
  if (!isStringList(body.splits) || !isStringList(body.joins)) {
    return NextResponse.json({ error: 'splits and joins must be lists of strings' }, { status: 400 })
  }
  await fs.mkdir(path.dirname(cellsFile), { recursive: true })
  await fs.writeFile(cellsFile, JSON.stringify({ splits: body.splits, joins: body.joins }, null, 2), 'utf8')
  return NextResponse.json({ ok: true })
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(entry => typeof entry === 'string')
}
