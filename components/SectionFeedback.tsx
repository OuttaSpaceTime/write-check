'use client'

import { useMemo } from 'react'
import { splitSections } from '@/lib/sections'
import type { Issue } from '@/lib/check/types'
import IssueList from './IssueList'

type Props = {
  text: string
  checkedText: string
  issues: Issue[]
  onApply: (issue: Issue, replacement: string) => void
  onJump: (issue: Issue) => void
}

export default function SectionFeedback({ text, checkedText, issues, onApply, onJump }: Props) {
  const sections = useMemo(() => splitSections(text), [text])
  return (
    <div className="sections">
      {sections.map(section => {
        const sectionIssues = issues.filter(
          issue => issue.offset >= section.offset && issue.offset < section.offset + section.length
        )
        return (
          <details key={`${section.offset}-${section.title}`} className="section" open={sectionIssues.length > 0}>
            <summary>
              <strong>{section.title}</strong>
              <span className="section-count">
                {sectionIssues.length === 0
                  ? 'no issues'
                  : `${sectionIssues.length} issue${sectionIssues.length === 1 ? '' : 's'}`}
              </span>
            </summary>
            <IssueList issues={sectionIssues} text={text} checkedText={checkedText} onApply={onApply} onJump={onJump} />
          </details>
        )
      })}
    </div>
  )
}
