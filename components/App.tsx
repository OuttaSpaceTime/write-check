'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CheckLanguage, CheckResponse, Issue } from '@/lib/check/types'
import { resolveReviewNotes, type ReviewNote } from '@/lib/review'
import Editor, { type EditorHandle } from './Editor'
import IssueList from './IssueList'
import IssuePopover from './IssuePopover'
import MetricsPanel from './MetricsPanel'
import Preview from './Preview'
import SectionFeedback from './SectionFeedback'
import Toolbar from './Toolbar'

type Conflict = { serverText: string; serverMtime: number }

type Popover = { issues: Issue[]; x: number; y: number }

export default function App() {
  const [text, setText] = useState('')
  const [checkedText, setCheckedText] = useState('')
  const [language, setLanguage] = useState<CheckLanguage>('auto')
  const [result, setResult] = useState<CheckResponse | null>(null)
  const [checking, setChecking] = useState(false)
  const [splitView, setSplitView] = useState(false)
  const [reviewNotes, setReviewNotes] = useState<ReviewNote[]>([])
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [popover, setPopover] = useState<Popover | null>(null)
  const editorRef = useRef<EditorHandle | null>(null)
  const textRef = useRef(text)
  textRef.current = text
  const checkedTextRef = useRef(checkedText)
  checkedTextRef.current = checkedText
  const conflictRef = useRef(conflict)
  conflictRef.current = conflict
  const lastSavedText = useRef('')
  const lastKnownMtime = useRef(0)
  const checkCounter = useRef(0)

  const runCheck = useCallback(async (current: string, lang: CheckLanguage) => {
    const id = ++checkCounter.current
    if (!current.trim()) {
      setResult(null)
      setCheckedText('')
      return
    }
    setChecking(true)
    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: current, language: lang }),
      })
      if (!response.ok) return
      const data = (await response.json()) as CheckResponse
      if (id === checkCounter.current) {
        setResult(data)
        setCheckedText(current)
      }
    } catch {
      return
    } finally {
      if (id === checkCounter.current) setChecking(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/document')
      .then(response => response.json())
      .then((data: { text: string; mtime: number }) => {
        if (cancelled || !data.text || textRef.current !== '') return
        setText(data.text)
        lastSavedText.current = data.text
        lastKnownMtime.current = data.mtime
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => void runCheck(text, language), 900)
    return () => clearTimeout(timer)
  }, [text, language, runCheck])

  useEffect(() => {
    if (text === lastSavedText.current || conflict) return
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/document', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
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
  }, [text, conflict])

  useEffect(() => {
    const interval = setInterval(async () => {
      if (conflictRef.current || textRef.current !== lastSavedText.current) return
      try {
        const response = await fetch('/api/document')
        if (!response.ok) return
        const data = (await response.json()) as { text: string; mtime: number }
        if (data.mtime > lastKnownMtime.current + 0.5 && data.text !== textRef.current) {
          setText(data.text)
          lastSavedText.current = data.text
          lastKnownMtime.current = data.mtime
        }
      } catch {
        return
      }
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let active = true
    const loadReview = async () => {
      try {
        const response = await fetch('/api/review')
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
  }, [])

  const spanIsCurrent = useCallback((issue: Issue) => {
    if (issue.length === 0) return true
    const current = textRef.current
    if (issue.offset + issue.length > current.length) return false
    return (
      current.slice(issue.offset, issue.offset + issue.length) ===
      checkedTextRef.current.slice(issue.offset, issue.offset + issue.length)
    )
  }, [])

  const handleApply = useCallback(
    (issue: Issue, replacement: string) => {
      if (!spanIsCurrent(issue)) return
      editorRef.current?.applyReplacement(issue.offset, issue.length, replacement)
    },
    [spanIsCurrent]
  )

  const handleJump = useCallback(
    (issue: Issue) => {
      if (!spanIsCurrent(issue)) return
      editorRef.current?.jumpTo(issue.offset, issue.length)
    },
    [spanIsCurrent]
  )

  const keepMine = useCallback(async () => {
    try {
      const response = await fetch('/api/document', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
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
  }, [])

  const loadExternal = useCallback(() => {
    if (!conflict) return
    setText(conflict.serverText)
    lastSavedText.current = conflict.serverText
    lastKnownMtime.current = conflict.serverMtime
    setConflict(null)
  }, [conflict])

  const reviewIssues = useMemo(() => resolveReviewNotes(text, reviewNotes), [text, reviewNotes])
  const issues = useMemo(
    () => [...(result?.issues ?? []), ...reviewIssues].sort((a, b) => a.offset - b.offset || b.length - a.length),
    [result, reviewIssues]
  )
  const metrics = result?.metrics ?? []

  const handleEditorClick = useCallback(
    (pos: number, coords: { x: number; y: number }) => {
      const hits = issues.filter(
        issue => issue.length > 0 && pos >= issue.offset && pos < issue.offset + issue.length && spanIsCurrent(issue)
      )
      setPopover(hits.length > 0 ? { issues: hits, x: coords.x, y: coords.y } : null)
    },
    [issues, spanIsCurrent]
  )

  useEffect(() => {
    setPopover(null)
  }, [text])

  return (
    <main className="app">
      <header className="app-header">
        <h1>Write Check</h1>
        <p className="subtitle">
          Grammar, spelling and AI-style feedback for German and English markdown — everything runs locally.
        </p>
      </header>
      <Toolbar
        language={language}
        onLanguageChange={setLanguage}
        splitView={splitView}
        onSplitViewChange={setSplitView}
        onIndent={() => editorRef.current?.indent()}
        onDeindent={() => editorRef.current?.deindent()}
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
      <Editor ref={editorRef} value={text} onChange={setText} issues={issues} onIssueClick={handleEditorClick} />
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
        Tab indents, Shift-Tab deindents. To leave the editor with the keyboard, press Escape and then Tab.
      </p>
      <section className="feedback">
        <h2>
          What to correct
          {result
            ? ` (${issues.length} issue${issues.length === 1 ? '' : 's'}, ${result.detectedLanguage === 'de' ? 'German' : 'English'})`
            : ''}
        </h2>
        {splitView ? (
          <SectionFeedback
            text={text}
            checkedText={checkedText}
            issues={issues}
            onApply={handleApply}
            onJump={handleJump}
          />
        ) : (
          <IssueList issues={issues} text={text} checkedText={checkedText} onApply={handleApply} onJump={handleJump} />
        )}
      </section>
      <MetricsPanel metrics={metrics} />
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
