import { describe, expect, it } from 'vitest'
import type { Issue, IssueSource } from '../lib/check/types'
import { dropKnownWords } from '../lib/words'

const text = 'Production still uses esbuild, so Oxc is not affected.'

function issueOn(word: string, source: IssueSource): Issue {
  return {
    id: `${source}-${word}`,
    source,
    ruleId: 'MORFOLOGIK_RULE_EN_US',
    title: 'Spelling mistake',
    message: '',
    explanation: '',
    replacements: [],
    offset: text.indexOf(word),
    length: word.length,
    severity: 'error',
  }
}

describe('dropKnownWords', () => {
  it('drops spelling findings on listed words, ignoring case', () => {
    const issues = [issueOn('esbuild', 'spelling'), issueOn('Oxc', 'spelling')]
    expect(dropKnownWords(issues, text, ['esbuild', 'oxc'])).toEqual([])
  })

  it('keeps spelling findings on words that are not listed', () => {
    const issues = [issueOn('esbuild', 'spelling'), issueOn('affected', 'spelling')]
    expect(dropKnownWords(issues, text, ['esbuild']).map(issue => issue.id)).toEqual(['spelling-affected'])
  })

  it('keeps findings of other kinds on a listed word', () => {
    const issues = [issueOn('esbuild', 'grammar'), issueOn('esbuild', 'style')]
    expect(dropKnownWords(issues, text, ['esbuild'])).toEqual(issues)
  })
})
