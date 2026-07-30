'use client'

import type { CheckLanguage } from '@/lib/check/types'

type Props = {
  language: CheckLanguage
  onLanguageChange: (language: CheckLanguage) => void
  splitView: boolean
  onSplitViewChange: (splitView: boolean) => void
  onIndent: () => void
  onDeindent: () => void
  onCheck: () => void
  checking: boolean
  languageToolAvailable: boolean | null
}

const LANGUAGES: { value: CheckLanguage; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'en-US', label: 'English' },
  { value: 'de-DE', label: 'Deutsch' },
]

export default function Toolbar(props: Props) {
  return (
    <div className="toolbar">
      <div className="toolbar-group" role="radiogroup" aria-label="Check language">
        {LANGUAGES.map(entry => (
          <button
            key={entry.value}
            type="button"
            role="radio"
            aria-checked={props.language === entry.value}
            className={props.language === entry.value ? 'segment active' : 'segment'}
            onClick={() => props.onLanguageChange(entry.value)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="toolbar-group">
        <button type="button" className="tool" onClick={props.onDeindent} title="Deindent selection (Shift-Tab)">
          ⇤ Deindent
        </button>
        <button type="button" className="tool" onClick={props.onIndent} title="Indent selection (Tab)">
          ⇥ Indent
        </button>
      </div>
      <div className="toolbar-group">
        <label className="split-toggle">
          <input
            type="checkbox"
            checked={props.splitView}
            onChange={event => props.onSplitViewChange(event.target.checked)}
          />
          Feedback per section
        </label>
      </div>
      <div className="toolbar-group toolbar-right">
        <span
          className={
            props.languageToolAvailable === null
              ? 'lt-status unknown'
              : props.languageToolAvailable
                ? 'lt-status online'
                : 'lt-status offline'
          }
        >
          ● LanguageTool{props.languageToolAvailable === false ? ' offline' : ''}
        </span>
        <button type="button" className="tool primary" onClick={props.onCheck} disabled={props.checking}>
          {props.checking ? 'Checking…' : 'Check now'}
        </button>
      </div>
    </div>
  )
}
