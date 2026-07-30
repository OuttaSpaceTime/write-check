import { describe, expect, it } from 'vitest'
import { languageToolAvailable, runLanguageTool } from '../lib/check/languagetool'

const available = await languageToolAvailable()

describe.skipIf(!available)('LanguageTool integration (requires local server)', () => {
  it('finds a german agreement error in markdown and maps offsets to the source', async () => {
    const text = '# Titel\n\n```js\nconstt x = 1\n```\n\nDie Hunde bellt laut.'
    const { issues, detected } = await runLanguageTool(text, 'de-DE')
    expect(detected).toBe('de-DE')
    expect(issues.some(issue => text.slice(issue.offset, issue.offset + issue.length).includes('bellt'))).toBe(true)
    const codeStart = text.indexOf('constt')
    expect(issues.some(issue => issue.offset >= codeStart && issue.offset < codeStart + 6)).toBe(false)
  })

  it('finds an english grammar error', async () => {
    const { issues } = await runLanguageTool('He go to school every day.', 'en-US', 'de-DE')
    expect(issues.some(issue => issue.source === 'grammar')).toBe(true)
  })

  it('detects the language automatically', async () => {
    const { detected } = await runLanguageTool('Der schnelle braune Fuchs springt über den faulen Hund.', 'auto')
    expect(detected.startsWith('de')).toBe(true)
  })

  it('does not report phantom double spaces around inline code', async () => {
    const { issues } = await runLanguageTool('Das ist ein `code` und ein Test.', 'de-DE')
    expect(issues.filter(issue => issue.ruleId === 'DOPPELTES_LEERZEICHEN')).toHaveLength(0)
  })

  it('finds spelling mistakes in german prose', async () => {
    const { issues } = await runLanguageTool('Das ist ein Fehlar im Text.', 'de-DE')
    expect(issues.some(issue => issue.source === 'spelling')).toBe(true)
  })
})
