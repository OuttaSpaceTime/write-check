import type { Issue } from '../check/types'
import { countWords } from './segment'

export type PatternCategory =
  | 'word-choice'
  | 'phrase'
  | 'structure'
  | 'tone'
  | 'punctuation'
  | 'chatbot-artifact'
  | 'german-speaker-tell'

export type Pattern = {
  id: string
  name: string
  category: PatternCategory
  phrases?: string[]
  regex?: RegExp
  raw?: boolean
  minCount?: number
  minPer1000Words?: number
  why: string
  suggestion: string
}

export function findPatternIssues(prose: string, patterns: Pattern[], raw: string = prose): Issue[] {
  const totalWords = countWords(prose)
  const issues: Issue[] = []
  for (const pattern of patterns) {
    const haystack = pattern.raw ? raw : prose
    const matches = [...haystack.matchAll(compile(pattern))].filter(match => match[0].length > 0)
    if (matches.length === 0) continue
    if (pattern.minCount !== undefined && matches.length < pattern.minCount) continue
    if (
      pattern.minPer1000Words !== undefined &&
      totalWords > 0 &&
      (matches.length / totalWords) * 1000 < pattern.minPer1000Words
    ) {
      continue
    }
    for (const match of matches) {
      issues.push({
        id: `ai-${pattern.id}-${match.index}`,
        source: 'ai-pattern',
        ruleId: pattern.id,
        title: pattern.name,
        message: pattern.suggestion,
        explanation: pattern.why,
        replacements: [],
        offset: match.index,
        length: match[0].length,
        severity: 'info',
      })
    }
  }
  return issues
}

function compile(pattern: Pattern): RegExp {
  if (pattern.regex) {
    const flags = pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g'
    return new RegExp(pattern.regex.source, flags)
  }
  const alternatives = (pattern.phrases ?? [])
    .map(escapeRegExp)
    .sort((a, b) => b.length - a.length)
    .join('|')
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, 'giu')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
