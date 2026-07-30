import type { DocMetric } from '../check/types'
import { countWords, sentences, tokens } from './segment'

export function computeMetrics(prose: string, locale: 'en' | 'de'): DocMetric[] {
  const sentenceList = sentences(prose, locale)
  const wordList = tokens(prose)
  return [
    burstiness(sentenceList.map(sentence => sentence.words)),
    averageSentenceLength(sentenceList.map(sentence => sentence.words)),
    lexicalDiversity(wordList),
    paragraphUniformity(prose),
  ]
}

function burstiness(lengths: number[]): DocMetric {
  const value = coefficientOfVariation(lengths)
  const enough = lengths.length >= 8
  const flagged = enough && value < 0.35
  return {
    id: 'burstiness',
    label: 'Sentence rhythm (burstiness)',
    value: enough
      ? `variation ${value.toFixed(2)} across ${lengths.length} sentences`
      : `${lengths.length} sentences — too few to judge`,
    flagged,
    assessment: flagged
      ? 'Sentence lengths are very uniform. LLM text tends to keep an even rhythm, while human writing mixes short, punchy sentences with long, winding ones.'
      : 'Sentence length varies naturally.',
    advice:
      'Aim for contrast: follow a long, complex sentence with a short one. Reading aloud makes a monotone rhythm easy to hear.',
  }
}

function averageSentenceLength(lengths: number[]): DocMetric {
  const value = mean(lengths)
  const enough = lengths.length >= 5
  const flagged = enough && value > 26
  return {
    id: 'sentence-length',
    label: 'Average sentence length',
    value: enough ? `${value.toFixed(1)} words per sentence` : `${lengths.length} sentences — too few to judge`,
    flagged,
    assessment: flagged
      ? 'Sentences average more than 26 words. Long chains of clauses bury the point and are typical of generated filler.'
      : 'Average sentence length is in a readable range.',
    advice: 'Split sentences that carry more than one idea. One idea per sentence is a reliable default.',
  }
}

function lexicalDiversity(words: string[]): DocMetric {
  const value = movingAverageTypeTokenRatio(words)
  const enough = words.length >= 120
  const flagged = enough && value < 0.5
  return {
    id: 'lexical-diversity',
    label: 'Lexical diversity',
    value: enough ? `${value.toFixed(2)} (windowed type-token ratio)` : `${words.length} words — too few to judge`,
    flagged,
    assessment: flagged
      ? 'The same words repeat unusually often. Generated text recycles a small vocabulary of safe, generic words.'
      : 'Vocabulary variety looks healthy.',
    advice:
      'Replace repeated generic words with specific ones: name the tool, the number, the person, instead of "solution", "aspect", "process".',
  }
}

function paragraphUniformity(prose: string): DocMetric {
  const lengths = prose
    .split(/\n{2,}/)
    .map(paragraph => countWords(paragraph))
    .filter(count => count > 0)
  const value = coefficientOfVariation(lengths)
  const enough = lengths.length >= 4
  const flagged = enough && value < 0.25
  return {
    id: 'paragraph-uniformity',
    label: 'Paragraph size variation',
    value: enough
      ? `variation ${value.toFixed(2)} across ${lengths.length} paragraphs`
      : `${lengths.length} paragraphs — too few to judge`,
    flagged,
    assessment: flagged
      ? 'Paragraphs are suspiciously even in size — a hallmark of generated text, which portions content into equal blocks regardless of substance.'
      : 'Paragraph sizes vary with their content.',
    advice: 'Let content decide paragraph size: a one-sentence paragraph is fine for emphasis; merge fragments that share one thought.',
  }
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function coefficientOfVariation(values: number[]): number {
  const average = mean(values)
  if (average === 0) return 0
  const variance = mean(values.map(value => (value - average) ** 2))
  return Math.sqrt(variance) / average
}

function movingAverageTypeTokenRatio(words: string[], window = 100, step = 20): number {
  if (words.length === 0) return 0
  if (words.length < window) return uniqueRatio(words)
  let sum = 0
  let count = 0
  for (let start = 0; start + window <= words.length; start += step) {
    sum += uniqueRatio(words.slice(start, start + window))
    count++
  }
  return count === 0 ? uniqueRatio(words) : sum / count
}

function uniqueRatio(words: string[]): number {
  if (words.length === 0) return 0
  return new Set(words).size / words.length
}
