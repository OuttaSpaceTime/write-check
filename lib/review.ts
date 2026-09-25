import type { Issue, IssueScope, IssueSeverity } from './check/types'

export type ReviewNote = {
  quote?: string
  scope?: 'cell' | 'missing'
  title: string
  message: string
  explanation?: string
  suggestion?: string
  severity?: IssueSeverity
}

export function resolveReviewNotes(text: string, notes: ReviewNote[]): Issue[] {
  return notes
    .filter(note => typeof note?.title === 'string' && typeof note?.message === 'string')
    .map(note => {
      const quote = note.quote ?? ''
      const found = quote ? text.indexOf(quote) : -1
      const scope: IssueScope | undefined =
        found < 0 ? 'document' : note.scope === 'cell' || note.scope === 'missing' ? note.scope : undefined
      return {
        id: `claude|${note.title}|${quote}`,
        source: 'claude-feedback' as const,
        ruleId: 'claude-review',
        title: note.title,
        message: note.suggestion ? `${note.message} — Suggestion: ${note.suggestion}` : note.message,
        explanation: note.explanation ?? '',
        replacements: note.suggestion && !scope ? [note.suggestion] : [],
        offset: found < 0 ? 0 : scope === 'missing' ? found + quote.length : found,
        length: scope ? 0 : quote.length,
        severity: note.severity ?? 'warning',
        ...(scope && { scope }),
        ...(quote && found < 0 && { staleQuote: quote }),
      }
    })
}
