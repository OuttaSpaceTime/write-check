import type { Issue, IssueSeverity } from './check/types'

export type ReviewNote = {
  quote?: string
  title: string
  message: string
  explanation?: string
  suggestion?: string
  severity?: IssueSeverity
}

export function resolveReviewNotes(text: string, notes: ReviewNote[]): Issue[] {
  return notes
    .filter(note => typeof note?.title === 'string' && typeof note?.message === 'string')
    .map((note, index) => {
      const offset = note.quote ? text.indexOf(note.quote) : -1
      const anchored = offset >= 0 && !!note.quote
      return {
        id: `claude-${index}-${note.title}`,
        source: 'claude-feedback' as const,
        ruleId: 'claude-review',
        title: note.title,
        message: note.suggestion ? `${note.message} — Suggestion: ${note.suggestion}` : note.message,
        explanation: note.explanation ?? '',
        replacements: note.suggestion && anchored ? [note.suggestion] : [],
        offset: anchored ? offset : 0,
        length: anchored && note.quote ? note.quote.length : 0,
        severity: note.severity ?? 'warning',
      }
    })
}
