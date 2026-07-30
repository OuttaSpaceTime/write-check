import { describe, expect, it } from 'vitest'
import { markupRanges, proseOnly } from '../lib/markdown/mask'

const doc = [
  '# Title',
  '',
  'Intro text with `inline code` and **bold** words.',
  '',
  '```js',
  'const secret = "delve into"',
  '```',
  '',
  '> quoted prose',
  '',
  '- item one',
  '',
  'See [the docs](https://example.com/docs) for more.',
].join('\n')

describe('proseOnly', () => {
  it('preserves length and newlines', () => {
    const prose = proseOnly(doc)
    expect(prose.length).toBe(doc.length)
    for (let i = 0; i < doc.length; i++) {
      if (doc[i] === '\n') expect(prose[i]).toBe('\n')
    }
  })

  it('masks fenced code content', () => {
    expect(proseOnly(doc)).not.toContain('delve')
  })

  it('masks inline code and keeps surrounding prose', () => {
    const prose = proseOnly(doc)
    expect(prose).not.toContain('inline code')
    expect(prose).toContain('Intro text with')
  })

  it('keeps bold words but masks the asterisks', () => {
    const prose = proseOnly(doc)
    expect(prose).toContain('bold')
    expect(prose).not.toContain('*')
  })

  it('masks the heading marker and keeps the title text', () => {
    const prose = proseOnly(doc)
    expect(prose).toContain('Title')
    expect(prose).not.toContain('#')
  })

  it('masks the blockquote marker and keeps the quote', () => {
    const prose = proseOnly(doc)
    expect(prose).toContain('quoted prose')
    expect(prose).not.toContain('>')
  })

  it('masks list markers and keeps item text', () => {
    const prose = proseOnly(doc)
    expect(prose).toContain('item one')
    expect(prose).not.toContain('- item')
  })

  it('masks link targets and keeps link text', () => {
    const prose = proseOnly(doc)
    expect(prose).toContain('the docs')
    expect(prose).not.toContain('example.com')
  })
})

describe('autolinks', () => {
  it('masks bare autolinked URLs entirely', () => {
    const prose = proseOnly('See https://example.com/some-long-path for details.')
    expect(prose).not.toContain('example')
    expect(prose).toContain('See')
    expect(prose).toContain('for details.')
  })

  it('masks angle-bracket autolinks entirely', () => {
    const prose = proseOnly('Contact <https://example.com/help> today.')
    expect(prose).not.toContain('example')
    expect(prose).toContain('today.')
  })

  it('masks email autolinks entirely', () => {
    const prose = proseOnly('Write to felix@example.com about it.')
    expect(prose).not.toContain('felix@example.com')
    expect(prose).toContain('about it.')
  })
})

describe('markupRanges', () => {
  it('returns sorted, non-overlapping ranges', () => {
    const ranges = markupRanges(doc)
    expect(ranges.length).toBeGreaterThan(0)
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i]!.start).toBeGreaterThanOrEqual(ranges[i - 1]!.end)
    }
  })
})
