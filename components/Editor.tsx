'use client'

import { indentLess, indentMore, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { Issue } from '@/lib/check/types'

export type EditorHandle = {
  applyReplacement: (offset: number, length: number, replacement: string) => void
  jumpTo: (offset: number, length: number) => void
  indent: () => void
  deindent: () => void
}

type Props = {
  value: string
  onChange: (value: string) => void
  issues: Issue[]
  onIssueClick: (pos: number, coords: { x: number; y: number }) => void
}

const Editor = forwardRef<EditorHandle, Props>(function Editor({ value, onChange, issues, onIssueClick }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onIssueClickRef = useRef(onIssueClick)
  onIssueClickRef.current = onIssueClick

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return
    const view = new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: [
          basicSetup,
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          EditorView.lineWrapping,
          keymap.of([indentWithTab]),
          lintGutter(),
          placeholder('Write or paste your markdown here…'),
          EditorView.updateListener.of(update => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString())
          }),
          EditorView.domEventHandlers({
            click: (event, target) => {
              const pos = target.posAtCoords({ x: event.clientX, y: event.clientY })
              if (pos !== null) onIssueClickRef.current(pos, { x: event.clientX, y: event.clientY })
              return false
            },
          }),
        ],
      }),
      parent,
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      const anchor = Math.min(view.state.selection.main.anchor, value.length)
      view.dispatch({ changes: { from: 0, to: current.length, insert: value }, selection: { anchor } })
    }
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const docLength = view.state.doc.length
    const diagnostics: Diagnostic[] = issues
      .filter(issue => issue.length > 0 && issue.offset + issue.length <= docLength)
      .map(issue => ({
        from: issue.offset,
        to: issue.offset + issue.length,
        severity: issue.severity,
        message: `${issue.title}: ${issue.message}`,
        actions: issue.replacements.slice(0, 3).map(replacement => ({
          name: replacement === '' ? 'remove' : replacement,
          apply: (target: EditorView, from: number, to: number) => {
            target.dispatch({ changes: { from, to, insert: replacement } })
          },
        })),
      }))
    view.dispatch(setDiagnostics(view.state, diagnostics))
  }, [issues])

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
        const from = Math.min(offset, view.state.doc.length)
        const to = Math.min(offset + length, view.state.doc.length)
        view.dispatch({
          selection: { anchor: from, head: to },
          effects: EditorView.scrollIntoView(from, { y: 'center' }),
        })
        view.focus()
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
