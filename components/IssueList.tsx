'use client'

import { useState } from 'react'
import type { Issue, IssueSource } from '@/lib/check/types'

type Props = {
  issues: Issue[]
  isDone: (issue: Issue) => boolean
  onToggleDone: (issue: Issue) => void
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

const SCOPE_MARK = { cell: '¶', missing: '‸' }

export default function IssueList({ issues, isDone, onToggleDone, onApply, onJump }: Props) {
  const [showDone, setShowDone] = useState(false)
  const visible = showDone ? issues : issues.filter(issue => !isDone(issue))
  const doneCount = issues.filter(isDone).length
  return (
    <div className="issue-group">
      {visible.length > 0 && (
        <ul className="issue-list">
          {visible.map((issue, index) => {
            const checked = isDone(issue)
            return (
              <li
                key={`${issue.id}-${index}`}
                className={`issue issue-${issue.source}${checked ? ' is-done' : ''}`}
              >
                <input
                  type="checkbox"
                  className="done-box"
                  checked={checked}
                  onChange={() => onToggleDone(issue)}
                  aria-label={`Mark “${issue.title}” as done`}
                />
                <div className="issue-body">
                  <div className="issue-header">
                    {issue.scope && issue.scope !== 'document' && (
                      <span
                        className={`scope-mark scope-${issue.scope}`}
                        title={issue.scope === 'cell' ? 'About the whole cell' : 'Something is missing here'}
                      >
                        {SCOPE_MARK[issue.scope]}
                      </span>
                    )}
                    <span className={`badge badge-${issue.source}`}>{SOURCE_LABEL[issue.source]}</span>
                    <strong>{issue.title}</strong>
                    {issue.length > 0 && !checked && (
                      <button type="button" className="link-button" onClick={() => onJump(issue)}>
                        Jump to text
                      </button>
                    )}
                  </div>
                  {!checked && (
                    <>
                      {issue.staleQuote && (
                        <p className="stale-quote">
                          The quoted words are no longer in the text: “{issue.staleQuote}”
                        </p>
                      )}
                      <p className="issue-message">{issue.message}</p>
                      {issue.explanation && (
                        <p className="issue-why">
                          <span className="why-label">Why:</span> {issue.explanation}
                        </p>
                      )}
                      {issue.replacements.length > 0 && (
                        <div className="issue-fixes">
                          {issue.replacements.slice(0, 3).map((replacement, fixIndex) => (
                            <button
                              key={`${fixIndex}-${replacement}`}
                              type="button"
                              className="fix-button"
                              onClick={() => onApply(issue, replacement)}
                            >
                              {replacement === '' ? 'Remove' : replacement}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {doneCount > 0 && (
        <button type="button" className="done-row" onClick={() => setShowDone(!showDone)}>
          ✓ {doneCount} done · <span className="done-row-action">{showDone ? 'Hide' : 'Show'}</span>
        </button>
      )}
    </div>
  )
}
