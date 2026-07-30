import { markupRanges } from './mask'

export type AnnotationItem = { text: string } | { markup: string; interpretAs?: string }

export function buildAnnotation(text: string): AnnotationItem[] {
  const items: AnnotationItem[] = []
  let cursor = 0
  for (const range of markupRanges(text)) {
    if (range.start > cursor) items.push({ text: text.slice(cursor, range.start) })
    const markup = text.slice(range.start, range.end)
    if (markup.includes('\n')) {
      items.push({ markup, interpretAs: '\n\n' })
    } else if (/^`{1,3}[^`]+`{1,3}$/.test(markup)) {
      items.push({ markup, interpretAs: 'Code' })
    } else {
      items.push({ markup })
    }
    cursor = range.end
  }
  if (cursor < text.length) items.push({ text: text.slice(cursor) })
  return items
}

export function annotationJson(text: string): string {
  return JSON.stringify({ annotation: buildAnnotation(text) })
}
