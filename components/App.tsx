'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  cellIndexAt,
  cellIndexOf,
  cellLayout,
  cellStarts,
  deleteCell,
  deriveCells,
  insertCell,
  joinCells,
  keepIds,
  mergeCells,
  placeIssues,
  splitCell,
  splitIntoBlocks,
  type CellDoc,
  type CellLayout,
} from '@/lib/cells'
import { mapIssues, textChange } from '@/lib/check/mapIssues'
import type { CheckLanguage, CheckResponse, Issue } from '@/lib/check/types'
import { doneKey } from '@/lib/done'
import { resolveReviewNotes, type ReviewNote } from '@/lib/review'
import Cells from './Cells'
import type { CellCommand, EditorHandle, Pasted } from './Editor'
import IssuePopover from './IssuePopover'
import MetricsPanel from './MetricsPanel'
import Preview from './Preview'
import Toolbar from './Toolbar'

type Conflict = { serverText: string; serverMtime: number }

type Popover = { issues: Issue[]; x: number; y: number }

type Checked = { text: string; result: CheckResponse }

type Focus = { id: string; pos: number }

const JSON_HEADERS = { 'content-type': 'application/json' }

export default function App({ doc }: { doc: string }) {
  const query = `?doc=${encodeURIComponent(doc)}`
  const [cells, setCells] = useState<CellDoc>(() => deriveCells(''))
  const text = useMemo(() => joinCells(cells), [cells])
  const [language, setLanguage] = useState<CheckLanguage>('auto')
  const [checked, setChecked] = useState<Checked | null>(null)
  const [checking, setChecking] = useState(false)
  const [reviewNotes, setReviewNotes] = useState<ReviewNote[]>([])
  const [done, setDone] = useState<string[]>([])
  const [knownWords, setKnownWords] = useState('[]')
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [popover, setPopover] = useState<Popover | null>(null)
  const [focusRequest, setFocusRequest] = useState<Focus | null>(null)
  const editors = useRef(new Map<string, EditorHandle>())
  const focusedCell = useRef<string | null>(null)
  const cellsRef = useRef(cells)
  cellsRef.current = cells
  const textRef = useRef(text)
  textRef.current = text
  const conflictRef = useRef(conflict)
  conflictRef.current = conflict
  const lastSavedText = useRef('')
  const lastKnownMtime = useRef(0)
  const lastSavedLayout = useRef('{"splits":[],"joins":[]}')
  const lastSavedDone = useRef('[]')
  const checkCounter = useRef(0)

  const commit = useCallback((next: CellDoc, focus: Focus | null = null) => {
    cellsRef.current = next
    setCells(next)
    if (focus) setFocusRequest(focus)
  }, [])

  const replaceText = useCallback((next: string) => {
    commit(keepIds(cellsRef.current, deriveCells(next, cellLayout(cellsRef.current))))
  }, [commit])

  const runCheck = useCallback(async (current: string, lang: CheckLanguage) => {
    const id = ++checkCounter.current
    if (!current.trim()) {
      setChecked(null)
      return
    }
    setChecking(true)
    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ text: current, language: lang }),
      })
      if (!response.ok) return
      const data = (await response.json()) as CheckResponse
      if (id === checkCounter.current) setChecked({ text: current, result: data })
    } catch {
      return
    } finally {
      if (id === checkCounter.current) setChecking(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`/api/document${query}`).then(response => response.json() as Promise<{ text: string; mtime: number }>),
      fetch(`/api/cells${query}`).then(response => response.json() as Promise<CellLayout>),
    ])
      .then(([document, layout]) => {
        if (cancelled || !document.text || textRef.current !== '') return
        lastSavedLayout.current = JSON.stringify(layout)
        lastSavedText.current = document.text
        lastKnownMtime.current = document.mtime
        commit(deriveCells(document.text, layout))
      })
      .catch(() => undefined)
    fetch(`/api/done${query}`)
      .then(response => response.json() as Promise<{ done: string[] }>)
      .then(data => {
        if (cancelled) return
        lastSavedDone.current = JSON.stringify(data.done)
        setDone(data.done)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [query, commit])

  useEffect(() => {
    const timer = setTimeout(() => void runCheck(text, language), 900)
    return () => clearTimeout(timer)
  }, [text, language, knownWords, runCheck])

  useEffect(() => {
    const loadWords = async () => {
      try {
        const response = await fetch('/api/words')
        if (response.ok) setKnownWords(JSON.stringify(((await response.json()) as { words: string[] }).words))
      } catch {
        return
      }
    }
    void loadWords()
    const interval = setInterval(loadWords, 2500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (text === lastSavedText.current || conflict) return
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/document${query}`, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ text, baseMtime: lastKnownMtime.current }),
        })
        if (response.status === 409) {
          const data = (await response.json()) as { text: string; mtime: number }
          setConflict({ serverText: data.text, serverMtime: data.mtime })
          return
        }
        if (!response.ok) return
        const data = (await response.json()) as { mtime: number }
        lastSavedText.current = text
        lastKnownMtime.current = data.mtime
      } catch {
        return
      }
    }, 1200)
    return () => clearTimeout(timer)
  }, [text, conflict, query])

  useEffect(() => {
    const timer = setTimeout(async () => {
      const layoutJson = JSON.stringify(cellLayout(cellsRef.current))
      if (layoutJson === lastSavedLayout.current) return
      try {
        const response = await fetch(`/api/cells${query}`, { method: 'POST', headers: JSON_HEADERS, body: layoutJson })
        if (response.ok) lastSavedLayout.current = layoutJson
      } catch {
        return
      }
    }, 1200)
    return () => clearTimeout(timer)
  }, [cells, query])

  const doneJson = JSON.stringify(done)
  useEffect(() => {
    if (doneJson === lastSavedDone.current) return
    lastSavedDone.current = doneJson
    fetch(`/api/done${query}`, { method: 'POST', headers: JSON_HEADERS, body: `{"done":${doneJson}}` }).catch(
      () => undefined
    )
  }, [doneJson, query])

  useEffect(() => {
    const interval = setInterval(async () => {
      if (conflictRef.current || textRef.current !== lastSavedText.current) return
      try {
        const response = await fetch(`/api/document${query}`)
        if (!response.ok) return
        const data = (await response.json()) as { text: string; mtime: number }
        if (data.mtime > lastKnownMtime.current + 0.5 && data.text !== textRef.current) {
          lastSavedText.current = data.text
          lastKnownMtime.current = data.mtime
          replaceText(data.text)
        }
      } catch {
        return
      }
    }, 2500)
    return () => clearInterval(interval)
  }, [query, replaceText])

  useEffect(() => {
    let active = true
    const loadReview = async () => {
      try {
        const response = await fetch(`/api/review${query}`)
        if (!response.ok) return
        const data = (await response.json()) as { notes: ReviewNote[] }
        if (active) setReviewNotes(data.notes)
      } catch {
        return
      }
    }
    void loadReview()
    const interval = setInterval(loadReview, 2500)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [query])

  const keepMine = useCallback(async () => {
    try {
      const response = await fetch(`/api/document${query}`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ text: textRef.current, force: true }),
      })
      if (!response.ok) return
      const data = (await response.json()) as { mtime: number }
      lastSavedText.current = textRef.current
      lastKnownMtime.current = data.mtime
      setConflict(null)
    } catch {
      return
    }
  }, [query])

  const loadExternal = useCallback(() => {
    if (!conflict) return
    lastSavedText.current = conflict.serverText
    lastKnownMtime.current = conflict.serverMtime
    replaceText(conflict.serverText)
    setConflict(null)
  }, [conflict, replaceText])

  const checkIssues = useMemo(
    () => (checked ? mapIssues(checked.result.issues, textChange(checked.text, text)) : []),
    [checked, text]
  )
  const reviewIssues = useMemo(() => resolveReviewNotes(text, reviewNotes), [text, reviewNotes])
  const issues = useMemo(
    () => [...checkIssues, ...reviewIssues].sort((a, b) => a.offset - b.offset || b.length - a.length),
    [checkIssues, reviewIssues]
  )
  const starts = useMemo(() => cellStarts(cells), [cells])
  const placed = useMemo(() => placeIssues(issues, cells), [issues, cells])
  const doneKeys = useMemo(() => new Set(done), [done])
  const isDone = useCallback((issue: Issue) => doneKeys.has(doneKey(issue, text)), [doneKeys, text])
  const doneCount = issues.filter(isDone).length
  const result = checked?.result

  const toggleDone = useCallback(
    (issue: Issue) => {
      const key = doneKey(issue, textRef.current)
      setDone(previous => (previous.includes(key) ? previous.filter(entry => entry !== key) : [...previous, key]))
    },
    []
  )

  const locate = useCallback((issue: Issue) => {
    const current = cellsRef.current
    const cellOffsets = cellStarts(current)
    const index = cellIndexOf(current, cellOffsets, issue)
    return { cell: current.cells[index]!, local: issue.offset - cellOffsets[index]! }
  }, [])

  const handleApply = useCallback(
    (issue: Issue, replacement: string) => {
      const { cell, local } = locate(issue)
      editors.current.get(cell.id)?.applyReplacement(local, issue.length, replacement)
    },
    [locate]
  )

  const handleJump = useCallback(
    (issue: Issue) => {
      const { cell, local } = locate(issue)
      editors.current.get(cell.id)?.jumpTo(local, issue.length)
    },
    [locate]
  )

  const handleHover = useCallback(
    (issue: Issue | null) => {
      editors.current.forEach(editor => editor.highlight(0, 0))
      if (!issue) return
      const { cell, local } = locate(issue)
      editors.current.get(cell.id)?.highlight(local, issue.length)
    },
    [locate]
  )

  const findingText = useCallback((issue: Issue) => {
    const words = textRef.current.slice(issue.offset, issue.offset + issue.length)
    const fixes = issue.replacements.slice(0, 3).map(replacement => (replacement === '' ? 'remove' : replacement))
    return [
      words ? `${issue.title}: “${words}”` : issue.title,
      issue.message,
      issue.explanation && `Why: ${issue.explanation}`,
      fixes.length > 0 && `Suggestions: ${fixes.join(', ')}`,
    ]
      .filter(Boolean)
      .join('\n')
  }, [])

  const handleCellChange = useCallback(
    (id: string, value: string, pasted: Pasted | null) => {
      const current = cellsRef.current
      const updated = { ...current, cells: current.cells.map(cell => (cell.id === id ? { ...cell, text: value } : cell)) }
      const index = updated.cells.findIndex(cell => cell.id === id)
      const split = pasted ? splitIntoBlocks(updated, index, pasted.from, pasted.to) : updated
      if (!pasted || split === updated) {
        commit(updated)
        return
      }
      const position = cellStarts(updated)[index]! + pasted.to
      const splitStarts = cellStarts(split)
      const target = cellIndexAt(splitStarts, position)
      commit(split, { id: split.cells[target]!.id, pos: position - splitStarts[target]! })
    },
    [commit]
  )

  const handleCommand = useCallback(
    (id: string, command: CellCommand, pos: number) => {
      const current = cellsRef.current
      const index = current.cells.findIndex(cell => cell.id === id)
      const cell = current.cells[index]
      const previous = current.cells[index - 1]
      const next = current.cells[index + 1]
      if (!cell) return false
      if (command === 'up' && previous) setFocusRequest({ id: previous.id, pos: previous.text.length })
      if (command === 'down' && next) setFocusRequest({ id: next.id, pos: 0 })
      if (command === 'split') {
        if (cell.text.slice(pos).trim() === '') {
          const inserted = insertCell(current, index)
          commit(inserted, { id: inserted.cells[index + 1]!.id, pos: 0 })
          return true
        }
        const split = splitCell(current, index, pos)
        if (split !== current) commit(split, { id: split.cells[index + 1]!.id, pos: 0 })
        return true
      }
      if (command === 'mergeUp' && previous) {
        if (cell.text === '') commit(deleteCell(current, index), { id: previous.id, pos: previous.text.length })
        else if (previous.text === '') commit(deleteCell(current, index - 1), { id, pos: 0 })
        else commit(mergeCells(current, index - 1), { id: previous.id, pos: previous.text.length + current.gaps[index]!.length })
      }
      if (command === 'mergeDown' && next) {
        if (next.text === '') commit(deleteCell(current, index + 1), { id, pos })
        else if (cell.text === '') commit(deleteCell(current, index), { id: next.id, pos: 0 })
        else commit(mergeCells(current, index), { id, pos })
      }
      return command === 'up' || command === 'mergeUp' ? !!previous : !!next
    },
    [commit]
  )

  const handleCellClick = useCallback(
    (id: string, pos: number, coords: { x: number; y: number }) => {
      const index = cells.cells.findIndex(cell => cell.id === id)
      const offset = starts[index]! + pos
      const hits = placed.cells[index]!.words.filter(
        issue => offset >= issue.offset && offset < issue.offset + issue.length && !isDone(issue)
      )
      setPopover(hits.length > 0 ? { issues: hits, x: coords.x, y: coords.y } : null)
    },
    [cells, placed, starts, isDone]
  )

  const editorRef = useCallback((id: string, handle: EditorHandle | null) => {
    if (handle) editors.current.set(id, handle)
    else editors.current.delete(id)
  }, [])

  const focused = () => editors.current.get(focusedCell.current ?? '')

  useEffect(() => {
    setPopover(null)
  }, [text])

  return (
    <main className="app">
      <header className="app-header">
        <h1>Write Check</h1>
      </header>
      <Toolbar
        language={language}
        onLanguageChange={setLanguage}
        onIndent={() => focused()?.indent()}
        onDeindent={() => focused()?.deindent()}
        onCheck={() => void runCheck(text, language)}
        checking={checking}
        languageToolAvailable={result ? result.languageToolAvailable : null}
      />
      {result?.languageToolStatus === 'unavailable' && (
        <p className="lt-warning">
          LanguageTool is not running — grammar and spelling checks are disabled. Start it with:{' '}
          <code>docker start languagetool || docker run -d --name languagetool -p 8010:8010 erikvl87/languagetool</code>
        </p>
      )}
      {(result?.languageToolStatus === 'timeout' || result?.languageToolStatus === 'error') && (
        <p className="lt-warning">
          LanguageTool {result.languageToolStatus === 'timeout' ? 'timed out on this large document' : 'returned an error'} —
          grammar results were skipped for this check. AI-pattern feedback is unaffected.
        </p>
      )}
      {conflict && (
        <div className="conflict-banner">
          <p>The document was changed outside the editor while you had unsaved edits.</p>
          <button type="button" className="tool" onClick={loadExternal}>
            Load external version
          </button>
          <button type="button" className="tool" onClick={() => void keepMine()}>
            Keep my version
          </button>
        </div>
      )}
      <p className="cells-summary">
        {result &&
          `${issues.length} finding${issues.length === 1 ? '' : 's'} · ${doneCount} done · ${
            result.detectedLanguage === 'de' ? 'German' : 'English'
          }`}
      </p>
      <Cells
        cells={cells}
        starts={starts}
        placed={placed}
        isDone={isDone}
        onToggleDone={toggleDone}
        onApply={handleApply}
        onJump={handleJump}
        onHover={handleHover}
        copyText={findingText}
        editorRef={editorRef}
        onCellChange={handleCellChange}
        onCellCommand={handleCommand}
        onCellClick={handleCellClick}
        onCellFocus={id => {
          focusedCell.current = id
        }}
        onCellBlur={id => {
          const current = cellsRef.current
          const index = current.cells.findIndex(cell => cell.id === id)
          if (current.cells[index]?.text === '') commit(deleteCell(current, index))
        }}
        onSplitAtCursor={id => handleCommand(id, 'split', editors.current.get(id)?.cursor() ?? 0)}
        onMergeWithNext={id => handleCommand(id, 'mergeDown', editors.current.get(id)?.cursor() ?? 0)}
        focusRequest={focusRequest}
        onInsertBelow={id => {
          const current = cellsRef.current
          const index = current.cells.findIndex(cell => cell.id === id)
          const inserted = insertCell(current, index)
          commit(inserted, { id: inserted.cells[index + 1]!.id, pos: 0 })
        }}
        onDelete={id => {
          const current = cellsRef.current
          commit(deleteCell(current, current.cells.findIndex(cell => cell.id === id)))
        }}
      />
      {popover && (
        <IssuePopover
          issues={popover.issues}
          x={popover.x}
          y={popover.y}
          onApply={handleApply}
          onClose={() => setPopover(null)}
        />
      )}
      <p className="editor-hint">
        Ctrl+Enter (⌘+Enter on a Mac) splits a cell at the cursor, or starts a new cell when the cursor is at its end.
        Backspace at the start of a cell merges it into the one above; Delete at its end pulls in the next one. The arrow
        keys move between cells. Tab indents, Shift-Tab deindents; press Escape and then Tab to leave a cell.
      </p>
      <MetricsPanel metrics={result?.metrics ?? []} />
      <section className="rendered">
        <div className="rendered-head">
          <h2>Final text</h2>
          <CopyDocumentButton text={text} />
        </div>
        <Preview text={text} />
      </section>
    </main>
  )
}

function CopyDocumentButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button type="button" className="tool" onClick={() => void copy()} disabled={!text}>
      {copied ? 'Copied ✓' : 'Copy markdown'}
    </button>
  )
}
