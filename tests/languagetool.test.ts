import { describe, expect, it } from 'vitest'
import { toIssue, type LtMatch } from '../lib/check/languagetool'

function match(overrides: Partial<LtMatch> & { rule?: Partial<LtMatch['rule']> }): LtMatch {
  return {
    message: 'Possible spelling mistake found.',
    shortMessage: 'Spelling mistake',
    offset: 10,
    length: 5,
    replacements: [{ value: 'their' }, { value: 'there' }],
    ...overrides,
    rule: {
      id: 'MORFOLOGIK_RULE_EN_US',
      description: 'Possible spelling mistake',
      issueType: 'misspelling',
      category: { id: 'TYPOS', name: 'Possible Typo' },
      ...overrides.rule,
    },
  }
}

describe('toIssue', () => {
  it('classifies misspellings as spelling errors', () => {
    const issue = toIssue(match({}), 0)
    expect(issue.source).toBe('spelling')
    expect(issue.severity).toBe('error')
    expect(issue.offset).toBe(10)
    expect(issue.length).toBe(5)
    expect(issue.replacements).toEqual(['their', 'there'])
  })

  it('classifies style categories as style warnings', () => {
    const issue = toIssue(
      match({ rule: { id: 'PASSIVE_VOICE', description: 'Passive voice', issueType: 'style', category: { id: 'STYLE', name: 'Style' } } }),
      1
    )
    expect(issue.source).toBe('style')
    expect(issue.severity).toBe('warning')
  })

  it('defaults to grammar errors', () => {
    const issue = toIssue(
      match({ rule: { id: 'AGREEMENT', description: 'Agreement error', issueType: 'grammar', category: { id: 'GRAMMAR', name: 'Grammar' } } }),
      2
    )
    expect(issue.source).toBe('grammar')
    expect(issue.severity).toBe('error')
  })

  it('limits replacements to five', () => {
    const issue = toIssue(
      match({ replacements: [1, 2, 3, 4, 5, 6, 7].map(n => ({ value: `option${n}` })) }),
      3
    )
    expect(issue.replacements).toHaveLength(5)
  })

  it('keeps the explanation tied to the rule description and category', () => {
    const issue = toIssue(match({}), 4)
    expect(issue.explanation).toContain('Possible spelling mistake')
    expect(issue.explanation).toContain('Possible Typo')
  })
})
