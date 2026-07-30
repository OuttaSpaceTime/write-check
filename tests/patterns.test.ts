import { describe, expect, it } from 'vitest'
import { findPatternIssues, type Pattern } from '../lib/ai/patterns'

const delve: Pattern = {
  id: 'delve',
  name: 'Delve',
  category: 'word-choice',
  phrases: ['delve into'],
  why: 'why',
  suggestion: 'suggestion',
}

describe('findPatternIssues', () => {
  it('finds phrase occurrences case-insensitively with correct offsets', () => {
    const text = 'We delve into detail. Then we Delve Into more.'
    const issues = findPatternIssues(text, [delve])
    expect(issues).toHaveLength(2)
    const first = issues[0]!
    expect(text.slice(first.offset, first.offset + first.length)).toBe('delve into')
    expect(first.ruleId).toBe('delve')
    expect(first.source).toBe('ai-pattern')
  })

  it('does not match inside longer words', () => {
    expect(findPatternIssues('They delve intoxication studies.', [delve])).toHaveLength(0)
  })

  it('respects umlaut word boundaries', () => {
    const zudem: Pattern = { ...delve, id: 'zudem', phrases: ['zudem'] }
    expect(findPatternIssues('Zudem kommt mehr.', [zudem])).toHaveLength(1)
    expect(findPatternIssues('Das gezudemte Ding.', [zudem])).toHaveLength(0)
  })

  it('applies minCount gating', () => {
    const gated: Pattern = { ...delve, minCount: 2 }
    expect(findPatternIssues('We delve into things.', [gated])).toHaveLength(0)
    expect(findPatternIssues('We delve into A. We delve into B.', [gated])).toHaveLength(2)
  })

  it('applies density gating per 1000 words', () => {
    const dash: Pattern = { ...delve, id: 'dash', regex: /—/gu, minPer1000Words: 5 }
    delete dash.phrases
    const sparse = Array.from({ length: 1000 }, (_, i) => `w${i}`).join(' ') + ' — done'
    expect(findPatternIssues(sparse, [dash])).toHaveLength(0)
    const dense = Array.from({ length: 100 }, (_, i) => `w${i}`).join(' ') + ' — done'
    expect(findPatternIssues(dense, [dash])).toHaveLength(1)
  })

  it('matches raw patterns against the unmasked document', () => {
    const bold: Pattern = { ...delve, id: 'bold', regex: /\*\*[^*]+\*\*/gu, raw: true }
    delete bold.phrases
    const raw = 'Some **bold** text.'
    const prose = 'Some   bold   text.'
    expect(findPatternIssues(prose, [bold])).toHaveLength(0)
    expect(findPatternIssues(prose, [bold], raw)).toHaveLength(1)
  })

  it('supports custom regex patterns across the whole text', () => {
    const parallelism: Pattern = {
      ...delve,
      id: 'not-just',
      regex: /\bnot (?:just|only)\b[^.!?\n]{3,80}?\bbut(?: also)?\b/giu,
    }
    delete parallelism.phrases
    const text = 'It is not just fast but also safe. It is not only cheap but robust.'
    expect(findPatternIssues(text, [parallelism])).toHaveLength(2)
  })
})
