'use client'

import { useEffect } from 'react'
import type { Issue, IssueSource } from '@/lib/check/types'

type Props = {
  issues: Issue[]
  x: number
  y: number
  onApply: (issue: Issue, replacement: string) => void
  onClose: () => void
}

const SOURCE_LABEL: Record<IssueSource, string> = {
  grammar: 'Grammar',
  spelling: 'Spelling',
  style: 'Style',
  'ai-pattern': 'AI pattern',
  'claude-feedback': 'Claude',
}

const WIDTH = 380

export default function IssuePopover({ issues, x, y, onApply, onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const left = Math.max(8, Math.min(x - 40, window.innerWidth - WIDTH - 16))
  const top = Math.max(8, Math.min(y + 16, window.innerHeight - 360))

  return (
    <>
      <div className="popover-backdrop" onMouseDown={onClose} />
      <div className="issue-popover" style={{ left, top, width: WIDTH }} role="dialog" aria-label="Issue details">
        <button type="button" className="popover-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {issues.map(issue => (
          <div key={issue.id} className="popover-issue">
            <div className="popover-issue-header">
              <span className={`badge badge-${issue.source}`}>{SOURCE_LABEL[issue.source]}</span>
              <strong>{issue.title}</strong>
            </div>
            <p className="popover-message">{issue.message}</p>
            {issue.explanation && <p className="popover-why">{issue.explanation}</p>}
            {issue.replacements.length > 0 && (
              <div className="issue-fixes">
                {issue.replacements.slice(0, 3).map((replacement, index) => (
                  <button
                    key={`${index}-${replacement}`}
                    type="button"
                    className="fix-button"
                    onClick={() => {
                      onApply(issue, replacement)
                      onClose()
                    }}
                  >
                    {replacement === '' ? 'Remove' : replacement}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
