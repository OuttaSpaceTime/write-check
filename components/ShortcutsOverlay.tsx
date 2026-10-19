'use client'

import { useEffect, useRef, useState } from 'react'

const SEPARATORS = ['+', 'then', '/']

const SHORTCUTS = [
  { keys: ['Mod', '+', 'Enter'], action: 'Split the cell at the cursor, or start a new cell at its end' },
  { keys: ['Backspace'], action: 'At the start of a cell: merge it into the one above' },
  { keys: ['Delete'], action: 'At the end of a cell: pull in the next one' },
  { keys: ['↑', '/', '↓', '/', '←', '/', '→'], action: 'Move between cells at their edges' },
  { keys: ['Tab'], action: 'Indent' },
  { keys: ['Shift', '+', 'Tab'], action: 'Deindent' },
  { keys: ['Esc', 'then', 'Tab'], action: 'Leave the cell' },
  { keys: ['?'], action: 'Show this overview, outside a cell' },
]

export default function ShortcutsOverlay() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [mod, setMod] = useState('Ctrl')

  const toggle = () => {
    if (dialog.current?.open) dialog.current.close()
    else dialog.current?.showModal()
  }

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setMod('⌘')
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key !== '?' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      if (target.isContentEditable || target.closest('input, textarea, select')) return
      event.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <button type="button" className="tool" onClick={toggle} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">
        ?
      </button>
      <dialog
        ref={dialog}
        className="shortcuts"
        aria-label="Keyboard shortcuts"
        onClick={event => event.target === event.currentTarget && event.currentTarget.close()}
      >
        <div className="shortcuts-body">
          <button type="button" className="popover-close" onClick={toggle} aria-label="Close">
            ×
          </button>
          <h2>Keyboard shortcuts</h2>
          <dl>
            {SHORTCUTS.map(shortcut => (
              <div key={shortcut.action} className="shortcut">
                <dt>
                  {shortcut.keys.map((key, index) =>
                    SEPARATORS.includes(key) ? (
                      <span key={index}>{key}</span>
                    ) : (
                      <kbd key={index}>{key === 'Mod' ? mod : key}</kbd>
                    )
                  )}
                </dt>
                <dd>{shortcut.action}</dd>
              </div>
            ))}
          </dl>
        </div>
      </dialog>
    </>
  )
}
