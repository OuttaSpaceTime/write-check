import type { Issue } from './types'

type TextChange = { from: number; to: number; insert: number }

export function textChange(before: string, after: string): TextChange {
  const shorter = Math.min(before.length, after.length)
  let prefix = 0
  while (prefix < shorter && before[prefix] === after[prefix]) prefix++
  let suffix = 0
  while (suffix < shorter - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++
  return { from: prefix, to: before.length - suffix, insert: after.length - suffix - prefix }
}

export function mapIssues(issues: Issue[], change: TextChange): Issue[] {
  const shift = change.insert - (change.to - change.from)
  return issues.flatMap(issue => {
    if (issue.offset + issue.length <= change.from) return [issue]
    if (issue.offset >= change.to) return [{ ...issue, offset: issue.offset + shift }]
    return []
  })
}
