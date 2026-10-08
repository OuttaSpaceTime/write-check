import { describe, expect, it } from 'vitest'
import { computeMetrics } from '../lib/ai/metrics'

function metric(text: string, id: string) {
  const found = computeMetrics(text, 'en').find(entry => entry.id === id)
  if (!found) throw new Error(`missing metric ${id}`)
  return found
}

const uniformSentences = Array.from({ length: 10 }, () => 'One two three four five six seven eight nine.').join(' ')

const variedSentences = Array.from({ length: 5 }, () =>
  'Stop. The quick brown fox jumps over the lazy dog while the rain keeps falling on the quiet empty street.'
).join(' ')

describe('burstiness', () => {
  it('flags uniform sentence lengths', () => {
    expect(metric(uniformSentences, 'burstiness').flagged).toBe(true)
  })

  it('accepts varied sentence lengths', () => {
    expect(metric(variedSentences, 'burstiness').flagged).toBe(false)
  })

  it('does not judge very short texts', () => {
    expect(metric('One sentence here. Another one.', 'burstiness').flagged).toBe(false)
  })
})

describe('average sentence length', () => {
  it('flags consistently long sentences', () => {
    const long = Array.from({ length: 6 }, () =>
      'Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega alpha beta gamma delta.'
    ).join(' ')
    expect(metric(long, 'sentence-length').flagged).toBe(true)
  })

  it('accepts normal sentence lengths', () => {
    expect(metric(uniformSentences, 'sentence-length').flagged).toBe(false)
  })
})

describe('lexical diversity', () => {
  it('flags highly repetitive vocabulary', () => {
    const repetitive = Array.from({ length: 20 }, () => 'the process provides a solution for the process and the solution works.').join(' ')
    expect(metric(repetitive, 'lexical-diversity').flagged).toBe(true)
  })

  it('accepts diverse vocabulary', () => {
    const diverse = Array.from({ length: 150 }, (_, index) => `word${index}`).join(' ') + '.'
    expect(metric(diverse, 'lexical-diversity').flagged).toBe(false)
  })
})

describe('paragraph uniformity', () => {
  it('flags equally sized paragraphs', () => {
    const paragraph = 'one two three four five six seven eight nine ten eleven twelve.'
    expect(metric(Array.from({ length: 5 }, () => paragraph).join('\n\n'), 'paragraph-uniformity').flagged).toBe(true)
  })

  it('accepts varied paragraph sizes', () => {
    const text = ['Tiny.', Array.from({ length: 40 }, (_, i) => `word${i}`).join(' '), 'Short one here.', 'Medium paragraph with several words in it.'].join('\n\n')
    expect(metric(text, 'paragraph-uniformity').flagged).toBe(false)
  })
})

function sentencesOf(lengths: number[]): string {
  return lengths.map(length => Array.from({ length }, (_, i) => (i === 0 ? 'Word' : `w${i}`)).join(' ') + '.').join(' ')
}

describe('grades', () => {
  it('grades sentence rhythm', () => {
    expect(metric(uniformSentences, 'burstiness').grade).toBe('weak')
    expect(metric(sentencesOf([7, 3, 7, 3, 7, 3, 7, 3, 7, 3]), 'burstiness').grade).toBe('ok')
    expect(metric(variedSentences, 'burstiness').grade).toBe('good')
    expect(metric('One sentence here. Another one.', 'burstiness').grade).toBeNull()
  })

  it('grades average sentence length', () => {
    expect(metric(sentencesOf([28, 28, 28, 28, 28]), 'sentence-length').grade).toBe('weak')
    expect(metric(sentencesOf([23, 23, 23, 23, 23]), 'sentence-length').grade).toBe('ok')
    expect(metric(uniformSentences, 'sentence-length').grade).toBe('good')
    expect(metric(sentencesOf([30, 30]), 'sentence-length').grade).toBeNull()
  })

  it('grades lexical diversity', () => {
    const repetitive = Array.from({ length: 20 }, () => 'the process provides a solution for the process and the solution works.').join(' ')
    expect(metric(repetitive, 'lexical-diversity').grade).toBe('weak')
    expect(metric(Array.from({ length: 200 }, (_, i) => `word${i % 60}`).join(' ') + '.', 'lexical-diversity').grade).toBe('ok')
    expect(metric(Array.from({ length: 150 }, (_, i) => `word${i}`).join(' ') + '.', 'lexical-diversity').grade).toBe('good')
    expect(metric('A few words only.', 'lexical-diversity').grade).toBeNull()
  })

  it('grades paragraph size variation', () => {
    const paragraphs = (lengths: number[]) => lengths.map(length => sentencesOf([length])).join('\n\n')
    expect(metric(paragraphs([12, 12, 12, 12, 12]), 'paragraph-uniformity').grade).toBe('weak')
    expect(metric(paragraphs([13, 7, 13, 7]), 'paragraph-uniformity').grade).toBe('ok')
    expect(metric(paragraphs([1, 40, 3, 7]), 'paragraph-uniformity').grade).toBe('good')
    expect(metric(paragraphs([5, 9]), 'paragraph-uniformity').grade).toBeNull()
  })
})
