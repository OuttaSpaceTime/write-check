'use client'

import type { CellDoc, PlacedIssues } from '@/lib/cells'
import type { Issue } from '@/lib/check/types'
import Editor, { type CellCommand, type EditorHandle, type Pasted } from './Editor'
import IssueList from './IssueList'

type Props = {
  cells: CellDoc
  starts: number[]
  placed: PlacedIssues
  isDone: (issue: Issue) => boolean
  onToggleDone: (issue: Issue) => void
  onApply: (issue: Issue, replacement: string) => void
  onJump: (issue: Issue) => void
  onHover: (issue: Issue | null) => void
  copyText: (issue: Issue) => string
  editorRef: (id: string, handle: EditorHandle | null) => void
  onCellChange: (id: string, value: string, pasted: Pasted | null) => void
  onCellCommand: (id: string, command: CellCommand, pos: number) => boolean
  onCellClick: (id: string, pos: number, coords: { x: number; y: number }) => void
  onCellFocus: (id: string) => void
  onCellBlur: (id: string) => void
  onSplitAtCursor: (id: string) => void
  onMergeWithNext: (id: string) => void
  onInsertBelow: (id: string) => void
  onDelete: (id: string) => void
  focusRequest: { id: string; pos: number } | null
}

export default function Cells(props: Props) {
  const { cells, starts, placed, isDone } = props
  const list = { isDone, onToggleDone: props.onToggleDone, onApply: props.onApply, onJump: props.onJump, onHover: props.onHover, copyText: props.copyText }
  const last = cells.cells.length - 1
  return (
    <div className="cells">
      {placed.document.length > 0 && (
        <section className="whole-text" aria-label="Feedback on the whole text">
          <div className="box-head">Whole text</div>
          <IssueList issues={placed.document} {...list} />
        </section>
      )}
      {cells.cells.map((cell, index) => {
        const feedback = placed.cells[index]!
        const listed = [...feedback.notes, ...feedback.words]
        const underlined = feedback.words
          .filter(issue => !isDone(issue))
          .map(issue => ({ ...issue, offset: issue.offset - starts[index]! }))
        return (
          <section key={cell.id} className="cell" aria-label={`Cell ${index + 1}`}>
            <div className="cell-text">
              <span className="cell-actions">
                <button
                  type="button"
                  title="Split at the cursor (Ctrl+Enter)"
                  aria-label="Split at the cursor"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => props.onSplitAtCursor(cell.id)}
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <rect x="2" y="1.5" width="12" height="5" rx="1" />
                    <rect x="2" y="9.5" width="12" height="5" rx="1" />
                  </svg>
                </button>
                {index < last && (
                  <button
                    type="button"
                    title="Merge with the next cell (Delete at the end of the cell)"
                    aria-label="Merge with the next cell"
                    onClick={() => props.onMergeWithNext(cell.id)}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <rect x="2" y="1.5" width="12" height="13" rx="1" />
                      <path d="M4.5 8h7" strokeDasharray="1.5 1.5" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  title="New cell below"
                  aria-label="New cell below"
                  onClick={() => props.onInsertBelow(cell.id)}
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <rect x="2" y="1.5" width="12" height="6" rx="1" />
                    <path d="M8 10v5M5.5 12.5h5" />
                  </svg>
                </button>
                {last > 0 && (
                  <button
                    type="button"
                    title="Delete cell"
                    aria-label="Delete cell"
                    onClick={() => props.onDelete(cell.id)}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M2.5 4h11M6 4V2.5h4V4M4 4l0.7 10h6.6L12 4M6.8 6.5v5M9.2 6.5v5" />
                    </svg>
                  </button>
                )}
              </span>
              <Editor
                ref={handle => props.editorRef(cell.id, handle)}
                value={cell.text}
                issues={underlined}
                onChange={(value, pasted) => props.onCellChange(cell.id, value, pasted)}
                onCommand={(command, pos) => props.onCellCommand(cell.id, command, pos)}
                onIssueClick={(pos, coords) => props.onCellClick(cell.id, pos, coords)}
                onFocus={() => props.onCellFocus(cell.id)}
                onBlur={() => props.onCellBlur(cell.id)}
                focusRequest={props.focusRequest?.id === cell.id ? props.focusRequest : null}
              />
            </div>
            {listed.length > 0 && (
              <div className="cell-feedback">
                <IssueList issues={listed} {...list} />
              </div>
            )}
            {feedback.missing.length > 0 && (
              <div className="missing-slot">
                <div className="box-head">
                  <span className="scope-missing">‸</span> Something is missing here
                </div>
                <IssueList issues={feedback.missing} {...list} />
              </div>
            )}
          </section>
        )
      })}
      <button type="button" className="tool add-cell" onClick={() => props.onInsertBelow(cells.cells[last]!.id)}>
        + Add cell
      </button>
    </div>
  )
}
