import { describe, expect, it } from 'vitest'
import type { Issue } from '../lib/check/types'
import { doneKey } from '../lib/done'
import { resolveReviewNotes } from '../lib/review'

const text = 'We use runners since 2022. We use caches.'

function grammarIssue(offset: number): Issue {
  return {
    id: `lt-${offset}`,
    source: 'grammar',
    ruleId: 'SINCE_PERFECT',
    title: 'since',
    message: '',
    explanation: '',
    replacements: [],
    offset,
    length: 3,
    severity: 'warning',
  }
}

describe('doneKey', () => {
  it('ties a machine finding to its rule and flagged words, not its position', () => {
    const before = doneKey(grammarIssue(text.indexOf('use')), text)
    const shifted = 'Honestly, ' + text
    expect(doneKey(grammarIssue(shifted.indexOf('use')), shifted)).toBe(before)
    expect(before).toBe('SINCE_PERFECT|use')
  })

  it('ties a Claude note to its title and quote, even after the quote left the text', () => {
    const note = { quote: 'We use runners', title: 'Tense', message: 'x' }
    const anchored = resolveReviewNotes(text, [note])[0]!
    const stale = resolveReviewNotes('Rewritten.', [note])[0]!
    expect(doneKey(stale, 'Rewritten.')).toBe(doneKey(anchored, text))
  })
})
