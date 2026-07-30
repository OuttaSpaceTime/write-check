export type Sentence = { text: string; offset: number; words: number }

const WORD_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu

export function countWords(text: string): number {
  return (text.match(WORD_PATTERN) ?? []).length
}

export function sentences(text: string, locale: 'en' | 'de'): Sentence[] {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' })
  const result: Sentence[] = []
  for (const segment of segmenter.segment(text)) {
    const trimmed = segment.segment.trim()
    if (!trimmed) continue
    const words = countWords(trimmed)
    if (words === 0) continue
    const leading = segment.segment.length - segment.segment.trimStart().length
    result.push({ text: trimmed, offset: segment.index + leading, words })
  }
  return result
}

export function tokens(text: string): string[] {
  return (text.match(WORD_PATTERN) ?? []).map(word => word.toLowerCase())
}
