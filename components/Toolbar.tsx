'use client'

import type { CheckLanguage } from '@/lib/check/types'

type Props = {
  language: CheckLanguage
  onLanguageChange: (language: CheckLanguage) => void
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
        <button
          type="button"
          className="tool"
          onClick={props.onDeindent}
          title="Deindent the selection in the current cell (Shift-Tab)"
          aria-label="Deindent"
        >
          ⇤
        </button>
        <button
          type="button"
          className="tool"
          onClick={props.onIndent}
          title="Indent the selection in the current cell (Tab)"
          aria-label="Indent"
        >
          ⇥
        </button>
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
          <span className="lt-dot">●</span> LanguageTool{props.languageToolAvailable === false ? ' offline' : ''}
        </span>
        <button type="button" className="tool primary" onClick={props.onCheck} disabled={props.checking}>
          {props.checking ? 'Checking…' : 'Check now'}
        </button>
      </div>
    </div>
  )
}
