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
      const suggestion = note.suggestion ?? ''
      const appliedAt = quote && suggestion ? appliedSuggestionAt(text, quote, suggestion) : -1
      const anchor = appliedAt < 0 ? quote : suggestion
      const found = appliedAt >= 0 ? appliedAt : quote ? text.indexOf(quote) : -1
      const scope: IssueScope | undefined =
        found < 0 ? 'document' : note.scope === 'cell' || note.scope === 'missing' ? note.scope : undefined
      return {
        id: `claude|${note.title}|${quote}`,
        source: 'claude-feedback' as const,
        ruleId: 'claude-review',
        title: note.title,
        message: note.suggestion ? `${note.message} — Suggestion: ${note.suggestion}` : note.message,
        explanation: note.explanation ?? '',
        replacements: suggestion && !scope ? [appliedAt < 0 ? suggestion : quote] : [],
        offset: found < 0 ? 0 : scope === 'missing' ? found + anchor.length : found,
        length: scope ? 0 : anchor.length,
        severity: note.severity ?? 'warning',
        ...(scope && { scope }),
        ...(quote && found < 0 && { staleQuote: quote }),
        ...(appliedAt >= 0 && !scope && { applied: true }),
      }
    })
}

function appliedSuggestionAt(text: string, quote: string, suggestion: string): number {
  const quoteInSuggestion = suggestion.indexOf(quote)
  if (quoteInSuggestion < 0) return text.includes(quote) ? -1 : text.indexOf(suggestion)
  const start = text.indexOf(quote) - quoteInSuggestion
  return start >= 0 && text.startsWith(suggestion, start) ? start : -1
}
