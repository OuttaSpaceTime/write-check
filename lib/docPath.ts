import path from 'path'

export function resolveDocPath(doc: string | null | undefined, filename: string): string | null {
  const root = path.join(process.cwd(), 'data')
  const file = path.resolve(root, doc ?? '', filename)
  return file.startsWith(root + path.sep) ? file : null
}
