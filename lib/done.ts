import type { Issue } from './check/types'

export function doneKey(issue: Issue, text: string): string {
  if (issue.source === 'claude-feedback') return issue.id
  return `${issue.ruleId}|${text.slice(issue.offset, issue.offset + issue.length)}`
}
