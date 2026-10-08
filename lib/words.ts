import type { Issue } from './check/types'

export function dropKnownWords(issues: Issue[], text: string, words: string[]): Issue[] {
  const known = new Set(words.map(word => word.toLowerCase()))
  return issues.filter(
    issue => issue.source !== 'spelling' || !known.has(text.slice(issue.offset, issue.offset + issue.length).toLowerCase())
  )
}
