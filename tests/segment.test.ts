import { describe, expect, it } from 'vitest'
import { countWords, sentences, tokens } from '../lib/ai/segment'

describe('countWords', () => {
  it('counts german words with umlauts', () => {
    expect(countWords('Die Bäume wachsen schnell')).toBe(4)
  })

  it('treats contractions and hyphenated words as one word', () => {
    expect(countWords("It's a test-case")).toBe(3)
  })

  it('ignores punctuation-only content', () => {
    expect(countWords('... --- !!!')).toBe(0)
  })
})

describe('sentences', () => {
  it('splits english sentences with offsets into the source', () => {
    const text = 'This is one. And here is two! A third?'
    const result = sentences(text, 'en')
    expect(result.map(sentence => sentence.text)).toEqual(['This is one.', 'And here is two!', 'A third?'])
    expect(result[0]!.offset).toBe(0)
    expect(result[1]!.offset).toBe(text.indexOf('And'))
    expect(result[2]!.offset).toBe(text.indexOf('A third'))
  })

  it('splits german sentences', () => {
    const result = sentences('Das ist ein Satz. Hier kommt noch einer.', 'de')
    expect(result).toHaveLength(2)
    expect(result[0]!.words).toBe(4)
  })

  it('skips whitespace-only segments', () => {
    expect(sentences('   \n\n  ', 'en')).toEqual([])
  })
})

describe('tokens', () => {
  it('lowercases words', () => {
    expect(tokens('The THE the')).toEqual(['the', 'the', 'the'])
  })
})
