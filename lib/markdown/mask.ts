import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import type { Nodes } from 'mdast'

export type Range = { start: number; end: number }

const FULL_MASK = new Set([
  'code',
  'inlineCode',
  'html',
  'yaml',
  'image',
  'imageReference',
  'definition',
  'table',
  'thematicBreak',
  'footnoteReference',
])

const WRAPPER_MASK = new Set([
  'heading',
  'link',
  'linkReference',
  'strong',
  'emphasis',
  'delete',
  'listItem',
  'footnoteDefinition',
])

export function parseMarkdown(text: string) {
  return unified().use(remarkParse).use(remarkGfm).parse(text)
}

export function markupRanges(text: string): Range[] {
  const tree = parseMarkdown(text)
  const ranges: Range[] = []
  for (const child of tree.children) walk(child, ranges)
  for (const match of text.matchAll(/^[ \t]*(?:>[ \t]?)+/gm)) {
    ranges.push({ start: match.index, end: match.index + match[0].length })
  }
  return mergeRanges(ranges)
}

function walk(node: Nodes, ranges: Range[]): void {
  const outer = span(node)
  if (!outer) return
  if (FULL_MASK.has(node.type)) {
    ranges.push(outer)
    return
  }
  const children = 'children' in node ? node.children : []
  if (node.type === 'link' && children.length === 1) {
    const only = children[0]
    if (only && only.type === 'text' && node.url.endsWith(only.value)) {
      ranges.push(outer)
      return
    }
  }
  if (WRAPPER_MASK.has(node.type)) {
    const first = children[0] && span(children[0])
    const last = children[children.length - 1] && span(children[children.length - 1]!)
    if (!first || !last) {
      ranges.push(outer)
      return
    }
    if (first.start > outer.start) ranges.push({ start: outer.start, end: first.start })
    if (outer.end > last.end) ranges.push({ start: last.end, end: outer.end })
  }
  for (const child of children) walk(child, ranges)
}

function span(node: Nodes): Range | null {
  const start = node.position?.start.offset
  const end = node.position?.end.offset
  if (start === undefined || end === undefined || end <= start) return null
  return { start, end }
}

function mergeRanges(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end)
  const merged: Range[] = []
  for (const range of sorted) {
    const previous = merged[merged.length - 1]
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end)
    } else {
      merged.push({ ...range })
    }
  }
  return merged
}

const CODE_MASK = new Set(['code', 'inlineCode', 'html', 'yaml'])

export function codeRanges(text: string): Range[] {
  const tree = parseMarkdown(text)
  const ranges: Range[] = []
  const collect = (node: Nodes): void => {
    const outer = span(node)
    if (!outer) return
    if (CODE_MASK.has(node.type)) {
      ranges.push(outer)
      return
    }
    if ('children' in node) for (const child of node.children) collect(child)
  }
  for (const child of tree.children) collect(child)
  return mergeRanges(ranges)
}

export function proseOnly(text: string, ranges: Range[] = markupRanges(text)): string {
  const characters = text.split('')
  for (const range of ranges) {
    for (let i = range.start; i < range.end && i < characters.length; i++) {
      if (characters[i] !== '\n') characters[i] = ' '
    }
  }
  return characters.join('')
}
