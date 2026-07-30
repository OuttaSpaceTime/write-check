export type IssueSource = 'grammar' | 'spelling' | 'style' | 'ai-pattern' | 'claude-feedback'

export type IssueSeverity = 'error' | 'warning' | 'info'

export type Issue = {
  id: string
  source: IssueSource
  ruleId: string
  title: string
  message: string
  explanation: string
  replacements: string[]
  offset: number
  length: number
  severity: IssueSeverity
}

export type DocMetric = {
  id: string
  label: string
  value: string
  flagged: boolean
  assessment: string
  advice: string
}

export type CheckLanguage = 'en-US' | 'de-DE' | 'auto'

export type LanguageToolStatus = 'ok' | 'unavailable' | 'timeout' | 'error'

export type CheckResponse = {
  issues: Issue[]
  metrics: DocMetric[]
  detectedLanguage: 'en' | 'de'
  languageToolAvailable: boolean
  languageToolStatus: LanguageToolStatus
}
