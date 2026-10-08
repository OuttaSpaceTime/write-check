'use client'

import { indentLess, indentMore, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { setDiagnostics, type Diagnostic } from '@codemirror/lint'
import { EditorSelection, EditorState, Prec, StateEffect, StateField, type ChangeSet } from '@codemirror/state'
import { Decoration, EditorView, keymap, placeholder, type DecorationSet } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { minimalSetup } from 'codemirror'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { Issue } from '@/lib/check/types'

export type EditorHandle = {
  applyReplacement: (offset: number, length: number, replacement: string) => void
  jumpTo: (offset: number, length: number) => void
  highlight: (offset: number, length: number) => void
  cursor: () => number
  indent: () => void
  deindent: () => void
}

export type CellCommand = 'split' | 'mergeUp' | 'mergeDown' | 'up' | 'down'

export type Pasted = { from: number; to: number }

type Props = {
  value: string
  onChange: (value: string, pasted: Pasted | null) => void
  issues: Issue[]
  onIssueClick: (pos: number, coords: { x: number; y: number }) => void
  onCommand: (command: CellCommand, pos: number) => boolean
  onFocus: () => void
  onBlur: () => void
  focusRequest: { pos: number } | null
}

const Editor = forwardRef<EditorHandle, Props>(function Editor(
  { value, onChange, issues, onIssueClick, onCommand, onFocus, onBlur, focusRequest },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const callbacks = useRef({ onChange, onIssueClick, onCommand, onFocus, onBlur })
  callbacks.current = { onChange, onIssueClick, onCommand, onFocus, onBlur }

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return
    const view = new EditorView({ state: createState(value, callbacks), parent })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view || view.state.doc.toString() === value) return
    const anchor = Math.min(view.state.selection.main.anchor, value.length)
    view.setState(createState(value, callbacks, anchor))
    view.dispatch(setDiagnostics(view.state, diagnosticsFor(issues, value.length)))
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    if (view && focusRequest) placeCursor(view, focusRequest.pos)
  }, [focusRequest])

  const signature = issues.map(issue => `${issue.id}:${issue.offset}:${issue.length}`).join('|')
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch(setDiagnostics(view.state, diagnosticsFor(issues, view.state.doc.length)))
  }, [signature])

  useImperativeHandle(
    ref,
    () => ({
      applyReplacement(offset, length, replacement) {
        const view = viewRef.current
        if (!view) return
        const to = Math.min(offset + length, view.state.doc.length)
        view.dispatch({ changes: { from: Math.min(offset, to), to, insert: replacement } })
        view.focus()
      },
      jumpTo(offset, length) {
        const view = viewRef.current
        if (!view) return
        const from = Math.max(0, Math.min(offset, view.state.doc.length))
        const to = Math.max(from, Math.min(offset + length, view.state.doc.length))
        view.dispatch({
          selection: { anchor: from, head: to },
          effects: EditorView.scrollIntoView(from, { y: 'center' }),
        })
        view.focus()
      },
      highlight(offset, length) {
        const view = viewRef.current
        if (!view) return
        const from = Math.max(0, Math.min(offset, view.state.doc.length))
        const to = Math.max(from, Math.min(offset + length, view.state.doc.length))
        view.dispatch({ effects: setHighlight.of({ from, to }) })
      },
      cursor() {
        return viewRef.current?.state.selection.main.head ?? 0
      },
      indent() {
        const view = viewRef.current
        if (view) indentMore(view)
      },
      deindent() {
        const view = viewRef.current
        if (view) indentLess(view)
      },
    }),
    []
  )

  return <div className="editor" ref={containerRef} />
})

export default Editor

const writingHighlight = HighlightStyle.define([
  { tag: tags.heading, fontWeight: '700' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.processingInstruction, color: 'var(--markup)' },
  { tag: [tags.url, tags.link], color: 'var(--accent)' },
  { tag: tags.quote, color: 'var(--muted)' },
])

const setHighlight = StateEffect.define<{ from: number; to: number }>()

const highlightMark = Decoration.mark({ class: 'cm-finding-highlight' })

const highlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(highlight, transaction) {
    if (transaction.docChanged) return Decoration.none
    for (const effect of transaction.effects) {
      if (effect.is(setHighlight)) {
        const { from, to } = effect.value
        return to > from ? Decoration.set([highlightMark.range(from, to)]) : Decoration.none
      }
    }
    return highlight
  },
  provide: field => EditorView.decorations.from(field),
})

type Callbacks = { current: Pick<Props, 'onChange' | 'onIssueClick' | 'onCommand' | 'onFocus' | 'onBlur'> }

function createState(doc: string, callbacks: Callbacks, anchor = 0): EditorState {
  const command = (name: CellCommand, applies: (view: EditorView) => boolean) => (view: EditorView) => {
    if (!view.state.selection.main.empty || !applies(view)) return false
    return callbacks.current.onCommand(name, view.state.selection.main.head)
  }
  const head = (view: EditorView) => view.state.selection.main.head
  return EditorState.create({
    doc,
    selection: EditorSelection.cursor(anchor),
    extensions: [
      minimalSetup,
      syntaxHighlighting(writingHighlight),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      EditorView.lineWrapping,
      highlightField,
      Prec.highest(
        keymap.of([
          { key: 'Mod-Enter', run: command('split', () => true) },
          { key: 'Backspace', run: command('mergeUp', view => head(view) === 0) },
          { key: 'Delete', run: command('mergeDown', view => head(view) === view.state.doc.length) },
          { key: 'ArrowUp', run: command('up', view => sameRow(view, head(view), 0)) },
          { key: 'ArrowLeft', run: command('up', view => head(view) === 0) },
          { key: 'ArrowDown', run: command('down', view => sameRow(view, head(view), view.state.doc.length)) },
          { key: 'ArrowRight', run: command('down', view => head(view) === view.state.doc.length) },
        ])
      ),
      keymap.of([indentWithTab]),
      placeholder('Write here…'),
      EditorView.updateListener.of(update => {
        if (update.focusChanged && update.view.hasFocus) callbacks.current.onFocus()
        if (update.focusChanged && !update.view.hasFocus && document.hasFocus()) callbacks.current.onBlur()
        if (!update.docChanged) return
        const pasted = update.transactions.some(transaction => transaction.isUserEvent('input.paste'))
        callbacks.current.onChange(update.state.doc.toString(), pasted ? insertedRange(update.changes) : null)
      }),
      EditorView.domEventHandlers({
        click: (event, view) => {
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
          if (pos !== null) callbacks.current.onIssueClick(pos, { x: event.clientX, y: event.clientY })
          return false
        },
      }),
    ],
  })
}

function placeCursor(view: EditorView, pos: number): void {
  const anchor = Math.max(0, Math.min(pos, view.state.doc.length))
  view.dispatch({ selection: { anchor }, effects: EditorView.scrollIntoView(anchor) })
  view.focus()
}

function sameRow(view: EditorView, pos: number, edge: number): boolean {
  const here = view.coordsAtPos(pos)
  const there = view.coordsAtPos(edge)
  if (!here || !there) return pos === edge
  return Math.abs(here.top - there.top) < 2
}

function insertedRange(changes: ChangeSet): Pasted {
  let from = Infinity
  let to = 0
  changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
    from = Math.min(from, fromB)
    to = Math.max(to, toB)
  })
  return { from, to }
}

function diagnosticsFor(issues: Issue[], docLength: number): Diagnostic[] {
  return issues
    .map(issue => ({ issue, from: Math.max(0, issue.offset), to: Math.min(issue.offset + issue.length, docLength) }))
    .filter(({ from, to }) => to > from)
    .map(({ issue, from, to }) => ({
      from,
      to,
      severity: issue.severity,
      message: `${issue.title}: ${issue.message}`,
      actions: issue.replacements.slice(0, 3).map(replacement => ({
        name: replacement === '' ? 'remove' : replacement,
        apply: (target: EditorView, from: number, to: number) => {
          target.dispatch({ changes: { from, to, insert: replacement } })
        },
      })),
    }))
}
