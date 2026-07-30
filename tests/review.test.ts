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

  it('drops malformed notes', () => {
    const malformed = [{ title: 'ok', message: 'fine' }, { title: 42 }, null] as never[]
    expect(resolveReviewNotes(text, malformed)).toHaveLength(1)
  })
})
