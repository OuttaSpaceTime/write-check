import { describe, expect, it } from 'vitest'
import { mapIssues, textChange } from '../lib/check/mapIssues'
import type { Issue } from '../lib/check/types'

function issueFor(text: string, words: string): Issue {
  const offset = text.indexOf(words)
  return {
    id: words,
    source: 'grammar',
    ruleId: 'RULE',
    title: words,
    message: '',
    explanation: '',
    replacements: [],
    offset,
    length: words.length,
    severity: 'warning',
  }
}

const flagged = (text: string, issues: Issue[]) => issues.map(issue => text.slice(issue.offset, issue.offset + issue.length))

describe('textChange', () => {
  it('finds the one region that differs', () => {
    expect(textChange('We use runners.', 'We have used runners.')).toEqual({ from: 3, to: 6, insert: 9 })
  })

  it('is empty for identical texts', () => {
    expect(textChange('same', 'same')).toEqual({ from: 4, to: 4, insert: 0 })
  })

  it('never lets the common prefix and suffix overlap', () => {
    expect(textChange('aa', 'aaa')).toEqual({ from: 2, to: 2, insert: 1 })
  })
})

describe('mapIssues', () => {
  const before = 'Teh first. We use runners since 2022. Recieve it.'
  const issues = [issueFor(before, 'Teh'), issueFor(before, 'use'), issueFor(before, 'Recieve')]

  it('shifts issues after an edit and keeps those before it', () => {
    const after = before.replace('first', 'very first')
    expect(flagged(after, mapIssues(issues, textChange(before, after)))).toEqual(['Teh', 'use', 'Recieve'])
  })

  it('drops an issue whose words were edited', () => {
    const after = before.replace('use', 'have used')
    expect(flagged(after, mapIssues(issues, textChange(before, after)))).toEqual(['Teh', 'Recieve'])
  })

  it('keeps an issue that ends exactly where text is inserted', () => {
    const after = before.replace('Teh', 'Teh!')
    expect(flagged(after, mapIssues(issues, textChange(before, after)))).toEqual(['Teh', 'use', 'Recieve'])
  })

  it('keeps every issue in place when nothing changed', () => {
    expect(mapIssues(issues, textChange(before, before))).toEqual(issues)
  })
})
