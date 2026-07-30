import { describe, expect, it } from 'vitest'
import { analyzeAi, guessLanguage } from '../lib/ai'

describe('analyzeAi', () => {
  it('does not flag patterns inside code blocks', () => {
    const text = '```\nwe delve into the code\n```\n\nPlain sentence without tells.'
    const issues = analyzeAi(text, 'en').issues.filter(issue => issue.ruleId === 'delve')
    expect(issues).toHaveLength(0)
  })

  it('maps offsets back to the original document after masking', () => {
    const text = '```js\nx()\n```\n\nWe delve into the topic here.'
    const issue = analyzeAi(text, 'en').issues.find(entry => entry.ruleId === 'delve')
    expect(issue).toBeDefined()
    expect(text.slice(issue!.offset, issue!.offset + issue!.length)).toBe('delve into')
  })

  it('does not count URL fragments as prose words', () => {
    const text = 'See https://example.com/some-really-long-path-segment-with-many-words-in-it for details today.'
    const metric = analyzeAi(text, 'en').metrics.find(entry => entry.id === 'lexical-diversity')
    expect(metric?.value).toContain('4 words')
  })

  it('ignores markdown formatting tells inside code fences', () => {
    const fenced = [
      '# Cheat sheet',
      '',
      'Prose paragraph without any tells here.',
      '',
      '```markdown',
      '- **Term one**: definition',
      '- **Term two**: definition',
      '- **Term three**: definition',
      '**bold** and **more bold** and **even more**',
      '```',
    ].join('\n')
    const ids = analyzeAi(fenced, 'en').issues.map(issue => issue.ruleId)
    expect(ids).not.toContain('inline-header-bullets')
    expect(ids).not.toContain('bold-overuse')
  })

  it('still flags markdown formatting tells outside code fences', () => {
    const unfenced = ['- **Term one**: definition', '- **Term two**: definition', '- **Term three**: definition'].join('\n')
    const ids = analyzeAi(unfenced, 'en').issues.map(issue => issue.ruleId)
    expect(ids).toContain('inline-header-bullets')
  })

  it('flags german patterns in german mode', () => {
    const text = 'Es ist wichtig zu beachten, dass alles gut wird.'
    const issue = analyzeAi(text, 'de').issues.find(entry => entry.ruleId === 'de-wichtig-zu-beachten')
    expect(issue).toBeDefined()
  })
})

describe('guessLanguage', () => {
  it('detects german', () => {
    expect(guessLanguage('Der Baum ist grün und die Sonne scheint nicht mehr.')).toBe('de')
  })

  it('detects english', () => {
    expect(guessLanguage('The tree is green and the sun is not shining anymore.')).toBe('en')
  })
})
