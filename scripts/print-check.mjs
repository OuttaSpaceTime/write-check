import { readFile } from 'node:fs/promises'

const text = await readFile(new URL('../data/document.md', import.meta.url), 'utf8')
const response = await fetch('http://localhost:3456/api/check', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ text, language: process.argv[2] ?? 'auto' }),
})
if (!response.ok) {
  console.error(`check failed: ${response.status}`)
  process.exit(1)
}
const result = await response.json()
console.log(JSON.stringify(result, null, 1))
