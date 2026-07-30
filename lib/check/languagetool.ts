import { annotationJson } from '../markdown/annotation'
import type { Issue, IssueSource } from './types'

const LT_URL = process.env.LANGUAGETOOL_URL ?? 'http://localhost:8010'

export type LtMatch = {
  message: string
  shortMessage?: string
  offset: number
  length: number
  replacements: { value: string }[]
  rule: {
    id: string
    description: string
    issueType?: string
    category: { id: string; name: string }
  }
}

export type LtResponse = {
  matches: LtMatch[]
  language?: { detectedLanguage?: { code?: string } }
}

export async function languageToolAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${LT_URL}/v2/languages`, { signal: AbortSignal.timeout(1500) })
    return response.ok
  } catch {
    return false
  }
}

export async function runLanguageTool(
  text: string,
  language: string,
  motherTongue?: string
): Promise<{ issues: Issue[]; detected: string }> {
  const params = new URLSearchParams({
    data: annotationJson(text),
    language,
    level: 'picky',
  })
  if (motherTongue) params.set('motherTongue', motherTongue)
  const response = await fetch(`${LT_URL}/v2/check`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(Math.min(120000, 30000 + Math.floor(text.length / 20))),
  })
  if (!response.ok) throw new Error(`LanguageTool responded with ${response.status}`)
  const body = (await response.json()) as LtResponse
  return {
    issues: body.matches.map(toIssue),
    detected: body.language?.detectedLanguage?.code ?? language,
  }
}

const STYLE_CATEGORIES = new Set(['STYLE', 'TYPOGRAPHY', 'REDUNDANCY', 'PLAIN_ENGLISH', 'WIKIPEDIA'])

export function toIssue(match: LtMatch, index: number): Issue {
  const issueType = match.rule.issueType ?? ''
  const source: IssueSource =
    issueType === 'misspelling'
      ? 'spelling'
      : STYLE_CATEGORIES.has(match.rule.category.id) || issueType === 'style'
        ? 'style'
        : 'grammar'
  return {
    id: `lt-${index}-${match.rule.id}-${match.offset}`,
    source,
    ruleId: match.rule.id,
    title: match.shortMessage || match.rule.category.name,
    message: match.message,
    explanation: `${match.rule.description} (${match.rule.category.name})`,
    replacements: match.replacements.slice(0, 5).map(replacement => replacement.value),
    offset: match.offset,
    length: match.length,
    severity: source === 'style' ? 'warning' : 'error',
  }
}
