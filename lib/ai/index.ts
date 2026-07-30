import type { DocMetric, Issue } from '../check/types'
import { codeRanges, proseOnly } from '../markdown/mask'
import { DE_PATTERNS } from './catalog.de'
import { DE_SPEAKER_TELLS } from './catalog.de-speaker'
import { EN_PATTERNS } from './catalog.en'
import { computeMetrics } from './metrics'
import { findPatternIssues } from './patterns'

const DE_STOPWORDS = ['der', 'die', 'das', 'und', 'nicht', 'ist', 'ein', 'eine', 'mit', 'auch', 'für', 'auf', 'werden', 'wird', 'sich', 'dass']
const EN_STOPWORDS = ['the', 'and', 'is', 'of', 'to', 'in', 'that', 'it', 'with', 'for', 'this', 'are', 'was', 'not', 'you', 'have']

export function guessLanguage(prose: string): 'en' | 'de' {
  const lower = prose.toLowerCase()
  const score = (words: string[]) =>
    words.reduce((sum, word) => sum + (lower.match(new RegExp(`(?<!\\p{L})${word}(?!\\p{L})`, 'gu')) ?? []).length, 0)
  return score(DE_STOPWORDS) > score(EN_STOPWORDS) ? 'de' : 'en'
}

export function analyzeAi(
  text: string,
  language: 'en' | 'de' | 'auto'
): { issues: Issue[]; metrics: DocMetric[]; lang: 'en' | 'de' } {
  const prose = proseOnly(text)
  const rawWithoutCode = proseOnly(text, codeRanges(text))
  const lang = language === 'auto' ? guessLanguage(prose) : language
  const issues = findPatternIssues(prose, lang === 'de' ? DE_PATTERNS : [...EN_PATTERNS, ...DE_SPEAKER_TELLS], rawWithoutCode)
  const metrics = computeMetrics(prose, lang)
  return { issues, metrics, lang }
}
