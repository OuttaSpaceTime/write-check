import type { Heading, Nodes } from 'mdast'
import { countWords } from './ai/segment'
import { parseMarkdown } from './markdown/mask'

export type Section = { title: string; offset: number; length: number }

export function splitSections(text: string): Section[] {
  const tree = parseMarkdown(text)
  const headings = tree.children.filter(
    (node): node is Heading => node.type === 'heading' && node.depth <= 3
  )
  const first = headings[0]
  if (!first) return [{ title: 'Document', offset: 0, length: text.length }]
  const sections: Section[] = []
  const firstStart = offsetOf(first)
  if (firstStart > 0 && countWords(text.slice(0, firstStart)) > 0) {
    sections.push({ title: 'Introduction', offset: 0, length: firstStart })
  }
  headings.forEach((heading, index) => {
    const start = offsetOf(heading)
    const next = headings[index + 1]
    const end = next ? offsetOf(next) : text.length
    sections.push({ title: textOf(heading) || `Section ${index + 1}`, offset: start, length: end - start })
  })
  return sections
}

function offsetOf(heading: Heading): number {
  return heading.position?.start.offset ?? 0
}

function textOf(node: Nodes): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value
  if ('children' in node) return node.children.map(textOf).join('')
  return ''
}
