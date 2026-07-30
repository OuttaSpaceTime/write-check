'use client'

import type { Issue, IssueSource } from '@/lib/check/types'

type Props = {
  issues: Issue[]
  text: string
  checkedText: string
  onApply: (issue: Issue, replacement: string) => void
  onJump: (issue: Issue) => void
}

const SOURCE_LABEL: Record<IssueSource, string> = {
  grammar: 'Grammar',
  spelling: 'Spelling',
  style: 'Style',
  'ai-pattern': 'AI pattern',
  'claude-feedback': 'Claude',
}

function spanIsCurrent(issue: Issue, text: string, checkedText: string): boolean {
  if (issue.length === 0) return true
  if (issue.offset + issue.length > text.length) return false
  return (
    text.slice(issue.offset, issue.offset + issue.length) ===
    checkedText.slice(issue.offset, issue.offset + issue.length)
  )
}

export default function IssueList({ issues, text, checkedText, onApply, onJump }: Props) {
  if (issues.length === 0) {
    return <p className="empty-state">No issues found.</p>
  }
  return (
    <ul className="issue-list">
      {issues.map(issue => {
        const current = spanIsCurrent(issue, text, checkedText)
        return (
          <li key={issue.id} className={`issue issue-${issue.source}`}>
            <div className="issue-header">
              <span className={`badge badge-${issue.source}`}>{SOURCE_LABEL[issue.source]}</span>
              <strong>{issue.title}</strong>
              {issue.length > 0 &&
                (current ? (
                  <button type="button" className="link-button" onClick={() => onJump(issue)}>
                    Jump to text
                  </button>
                ) : (
                  <span className="stale-note">text changed — re-checking…</span>
                ))}
            </div>
            <Excerpt source={issue.source === 'claude-feedback' ? text : checkedText} issue={issue} />
            <p className="issue-message">{issue.message}</p>
            {issue.explanation && (
              <p className="issue-why">
                <span className="why-label">Why:</span> {issue.explanation}
              </p>
            )}
            {issue.replacements.length > 0 && current && (
              <div className="issue-fixes">
                {issue.replacements.slice(0, 3).map((replacement, index) => (
                  <button
                    key={`${index}-${replacement}`}
                    type="button"
                    className="fix-button"
                    onClick={() => onApply(issue, replacement)}
                  >
                    {replacement === '' ? 'Remove' : replacement}
                  </button>
                ))}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Excerpt({ source, issue }: { source: string; issue: Issue }) {
  if (issue.length === 0 || issue.offset + issue.length > source.length) return null
  const start = Math.max(0, issue.offset - 30)
  const end = Math.min(source.length, issue.offset + issue.length + 30)
  return (
    <p className="issue-excerpt">
      {start > 0 ? '…' : ''}
      {source.slice(start, issue.offset)}
      <mark>{source.slice(issue.offset, issue.offset + issue.length)}</mark>
      {source.slice(issue.offset + issue.length, end)}
      {end < source.length ? '…' : ''}
    </p>
  )
}
