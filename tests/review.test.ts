import { describe, expect, it } from 'vitest'
import { resolveReviewNotes } from '../lib/review'

const text = 'First paragraph makes a claim.\n\nSecond paragraph contradicts it entirely.'

describe('resolveReviewNotes', () => {
  it('anchors a note to its quote in the text', () => {
    const issues = resolveReviewNotes(text, [
      { quote: 'contradicts it entirely', title: 'Logic', message: 'This contradicts your opening claim.' },
    ])
    const issue = issues[0]!
    expect(text.slice(issue.offset, issue.offset + issue.length)).toBe('contradicts it entirely')
    expect(issue.source).toBe('claude-feedback')
    expect(issue.severity).toBe('warning')
  })

  it('keeps unanchored notes with zero length', () => {
    const issues = resolveReviewNotes(text, [{ title: 'Structure', message: 'The argument order is inverted.' }])
    expect(issues[0]!.length).toBe(0)
    expect(issues[0]!.offset).toBe(0)
  })

  it('degrades to unanchored when the quote is stale', () => {
    const issues = resolveReviewNotes(text, [
      { quote: 'this text no longer exists', title: 'Old', message: 'Stale note.' },
    ])
    expect(issues[0]!.length).toBe(0)
  })

  it('offers the suggestion as a replacement for anchored notes', () => {
    const issues = resolveReviewNotes(text, [
      { quote: 'makes a claim', title: 'Clarity', message: 'Vague.', suggestion: 'claims X because Y' },
    ])
    expect(issues[0]!.replacements).toEqual(['claims X because Y'])
  })

  it('places a note without a quote at document level', () => {
    const issues = resolveReviewNotes(text, [{ title: 'Missing: the downside', message: 'Only benefits.' }])
    expect(issues[0]!.scope).toBe('document')
    expect(issues[0]!.staleQuote).toBeUndefined()
  })

  it('moves a note whose quote is gone to document level and remembers the quote', () => {
    const issues = resolveReviewNotes(text, [{ quote: 'rewritten words', title: 'Old', message: 'Stale note.' }])
    expect(issues[0]!.scope).toBe('document')
    expect(issues[0]!.staleQuote).toBe('rewritten words')
  })

  it('anchors a cell note to the start of its quote without marking words', () => {
    const issues = resolveReviewNotes(text, [
      { quote: 'Second paragraph', scope: 'cell', title: 'No point', message: 'What is this paragraph for?', suggestion: 'x' },
    ])
    const issue = issues[0]!
    expect(issue.scope).toBe('cell')
    expect(issue.length).toBe(0)
    expect(text.slice(issue.offset).startsWith('Second paragraph')).toBe(true)
    expect(issue.replacements).toEqual([])
  })

  it('anchors a missing note right after its quote', () => {
    const issues = resolveReviewNotes(text, [
      { quote: 'makes a claim.', scope: 'missing', title: 'Missing: evidence', message: 'Back the claim up.' },
    ])
    const issue = issues[0]!
    expect(issue.scope).toBe('missing')
    expect(issue.length).toBe(0)
    expect(text.slice(0, issue.offset).endsWith('makes a claim.')).toBe(true)
  })

  it('ignores an unknown scope and marks the quoted words', () => {
    const issues = resolveReviewNotes(text, [
      { quote: 'makes a claim', scope: 'sideways' as never, title: 'Clarity', message: 'Vague.' },
    ])
    expect(issues[0]!.scope).toBeUndefined()
    expect(issues[0]!.length).toBe('makes a claim'.length)
  })

  it('derives the id from title and quote, so it survives reordering', () => {
    const note = { quote: 'makes a claim', title: 'Clarity', message: 'Vague.' }
    const [first] = resolveReviewNotes(text, [note])
    const [, second] = resolveReviewNotes(text, [{ title: 'Other', message: 'x' }, note])
    expect(second!.id).toBe(first!.id)
  })

  it('drops malformed notes', () => {
    const malformed = [{ title: 'ok', message: 'fine' }, { title: 42 }, null] as never[]
    expect(resolveReviewNotes(text, malformed)).toHaveLength(1)
  })
})
