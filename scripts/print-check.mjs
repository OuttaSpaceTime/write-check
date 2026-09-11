const args = process.argv.slice(2)
const doc = args.find(arg => arg.startsWith('--doc='))?.slice('--doc='.length) ?? ''
const language = args.find(arg => !arg.startsWith('--')) ?? 'auto'

const source = await fetch(`http://localhost:3456/api/document?doc=${encodeURIComponent(doc)}`)
const { text } = await source.json()
if (!text) {
  console.error(`no document for doc=${doc}`)
  process.exit(1)
}
const response = await fetch('http://localhost:3456/api/check', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ text, language }),
})
if (!response.ok) {
  console.error(`check failed: ${response.status}`)
  process.exit(1)
}
const result = await response.json()
console.log(JSON.stringify(result, null, 1))
