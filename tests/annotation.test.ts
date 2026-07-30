import { describe, expect, it } from 'vitest'
import { buildAnnotation } from '../lib/markdown/annotation'

const doc = '# Head\n\nSome *prose* here.\n\n```py\nprint(1)\n```\n\nTail text.'

describe('buildAnnotation', () => {
  it('concatenates back to the original document', () => {
    const parts = buildAnnotation(doc).map(item => ('text' in item ? item.text : item.markup))
    expect(parts.join('')).toBe(doc)
  })

  it('marks the code fence as markup with a paragraph-break hint', () => {
    const items = buildAnnotation(doc)
    const fence = items.find(item => 'markup' in item && item.markup.includes('print(1)'))
    expect(fence).toBeDefined()
    expect(fence && 'interpretAs' in fence ? fence.interpretAs : undefined).toBe('\n\n')
  })

  it('keeps prose as text items', () => {
    const items = buildAnnotation(doc)
    const texts = items.filter(item => 'text' in item).map(item => ('text' in item ? item.text : ''))
    expect(texts.join('')).toContain('prose')
    expect(texts.join('')).toContain('Tail text.')
  })

  it('interprets inline code as a placeholder word to avoid phantom gaps', () => {
    const items = buildAnnotation('Run `npm install` now.')
    const code = items.find(item => 'markup' in item && item.markup === '`npm install`')
    expect(code && 'interpretAs' in code ? code.interpretAs : undefined).toBe('Code')
  })

  it('returns a single text item for plain prose', () => {
    expect(buildAnnotation('Just plain text.')).toEqual([{ text: 'Just plain text.' }])
  })
})
