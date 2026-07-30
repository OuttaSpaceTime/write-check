import { NextResponse } from 'next/server'
import { analyzeAi } from '@/lib/ai'
import { languageToolAvailable, runLanguageTool } from '@/lib/check/languagetool'
import type { CheckResponse, Issue, LanguageToolStatus } from '@/lib/check/types'

export async function POST(request: Request) {
  let body: { text?: unknown; language?: unknown }
  try {
    body = (await request.json()) as { text?: unknown; language?: unknown }
  } catch {
    return NextResponse.json({ error: 'request body must be JSON' }, { status: 400 })
  }
  if (typeof body.text !== 'string') {
    return NextResponse.json({ error: 'text must be a string' }, { status: 400 })
  }
  const text = body.text
  const requested =
    body.language === 'de-DE' || body.language === 'en-US' || body.language === 'auto' ? body.language : 'auto'

  let status: LanguageToolStatus = (await languageToolAvailable()) ? 'ok' : 'unavailable'
  let ltIssues: Issue[] = []
  let detected: string = requested
  if (status === 'ok' && text.trim().length > 0) {
    try {
      const motherTongue = requested === 'en-US' ? 'de-DE' : undefined
      const result = await runLanguageTool(text, requested, motherTongue)
      ltIssues = result.issues
      detected = result.detected
    } catch (error) {
      status = error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'error'
    }
  }

  const aiLanguage = detected.startsWith('de') ? 'de' : detected.startsWith('en') ? 'en' : 'auto'
  const ai = analyzeAi(text, aiLanguage)
  const response: CheckResponse = {
    issues: [...ltIssues, ...ai.issues].sort((a, b) => a.offset - b.offset || b.length - a.length),
    metrics: ai.metrics,
    detectedLanguage: ai.lang,
    languageToolAvailable: status === 'ok',
    languageToolStatus: status,
  }
  return NextResponse.json(response)
}
