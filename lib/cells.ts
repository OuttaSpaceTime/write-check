import type { Issue } from './check/types'
import { parseMarkdown } from './markdown/mask'

type Cell = { id: string; text: string }

export type CellDoc = { cells: Cell[]; gaps: string[] }

export type CellLayout = { splits: string[]; joins: string[] }

type CellFeedback = { words: Issue[]; notes: Issue[]; missing: Issue[] }

export type PlacedIssues = { document: Issue[]; cells: CellFeedback[] }

const NO_LAYOUT: CellLayout = { splits: [], joins: [] }

const ANCHOR_LENGTH = 60

let lastId = 0

function newId(): string {
  lastId += 1
  return `cell-${lastId}`
}

export function joinCells(doc: CellDoc): string {
  return doc.cells.reduce((text, cell, index) => text + cell.text + doc.gaps[index + 1], doc.gaps[0] ?? '')
}

export function cellStarts(doc: CellDoc): number[] {
  const starts: number[] = []
  let offset = doc.gaps[0]?.length ?? 0
  doc.cells.forEach((cell, index) => {
    starts.push(offset)
    offset += cell.text.length + (doc.gaps[index + 1]?.length ?? 0)
  })
  return starts
}

export function cellIndexAt(starts: number[], offset: number): number {
  let index = 0
  starts.forEach((start, candidate) => {
    if (start <= offset) index = candidate
  })
  return index
}

export function deriveCells(text: string, layout: CellLayout = NO_LAYOUT): CellDoc {
  let doc = paragraphCells(text)
  for (const anchor of layout.joins) {
    const index = cellStarts(doc).indexOf(text.indexOf(anchor))
    if (index > 0) doc = mergeCells(doc, index - 1)
  }
  for (const anchor of layout.splits) {
    const position = text.indexOf(anchor)
    if (position < 0) continue
    const starts = cellStarts(doc)
    const index = cellIndexAt(starts, position)
    doc = splitCell(doc, index, position - starts[index]!)
  }
  return doc
}

function paragraphCells(text: string): CellDoc {
  const ranges: { start: number; end: number; heading: boolean }[] = []
  for (const node of parseMarkdown(text).children) {
    const start = node.position?.start.offset
    const end = node.position?.end.offset
    if (start === undefined || end === undefined) continue
    const previous = ranges[ranges.length - 1]
    if (previous && (previous.heading || start < previous.end)) {
      previous.end = Math.max(previous.end, end)
      previous.heading = node.type === 'heading'
    } else {
      ranges.push({ start, end, heading: node.type === 'heading' })
    }
  }
  if (ranges.length === 0) return { cells: [{ id: newId(), text }], gaps: ['', ''] }
  const gaps = [text.slice(0, ranges[0]!.start)]
  ranges.forEach((range, index) => gaps.push(text.slice(range.end, ranges[index + 1]?.start ?? text.length)))
  return { cells: ranges.map(range => ({ id: newId(), text: text.slice(range.start, range.end) })), gaps }
}

export function splitCell(doc: CellDoc, index: number, at: number): CellDoc {
  const text = doc.cells[index]!.text
  let leftEnd = Math.min(at, text.length)
  while (leftEnd > 0 && /\s/.test(text[leftEnd - 1]!)) leftEnd--
  let rightStart = Math.min(at, text.length)
  while (rightStart < text.length && /\s/.test(text[rightStart]!)) rightStart++
  if (leftEnd === 0 || rightStart === text.length) return doc
  const left = { ...doc.cells[index]!, text: text.slice(0, leftEnd) }
  const right = { id: newId(), text: text.slice(rightStart) }
  return {
    cells: [...doc.cells.slice(0, index), left, right, ...doc.cells.slice(index + 1)],
    gaps: [...doc.gaps.slice(0, index + 1), text.slice(leftEnd, rightStart), ...doc.gaps.slice(index + 1)],
  }
}

export function mergeCells(doc: CellDoc, index: number): CellDoc {
  const first = doc.cells[index]
  const second = doc.cells[index + 1]
  if (!first || !second) return doc
  const merged = { ...first, text: first.text + doc.gaps[index + 1] + second.text }
  return {
    cells: [...doc.cells.slice(0, index), merged, ...doc.cells.slice(index + 2)],
    gaps: [...doc.gaps.slice(0, index + 1), ...doc.gaps.slice(index + 2)],
  }
}

export function insertCell(doc: CellDoc, index: number): CellDoc {
  const following = doc.gaps[index + 1]!
  const gap = index < doc.cells.length - 1 && !/\n\s*\n/.test(following) ? following : '\n\n'
  return {
    cells: [...doc.cells.slice(0, index + 1), { id: newId(), text: '' }, ...doc.cells.slice(index + 1)],
    gaps: [...doc.gaps.slice(0, index + 1), gap, ...doc.gaps.slice(index + 1)],
  }
}

export function deleteCell(doc: CellDoc, index: number): CellDoc {
  if (doc.cells.length === 1) return doc
  const gap = index === 0 ? 1 : index
  return {
    cells: doc.cells.filter((_, candidate) => candidate !== index),
    gaps: doc.gaps.filter((_, candidate) => candidate !== gap),
  }
}

export function splitIntoBlocks(doc: CellDoc, index: number, from: number, to: number): CellDoc {
  const starts = cellStarts(paragraphCells(doc.cells[index]!.text)).filter(start => start > 0 && start >= from && start <= to)
  if (starts.length === 0) return doc
  const split = starts.reverse().reduce((current, start) => splitCell(current, index, start), doc)
  const parts = split.cells.length - doc.cells.length + 1
  return {
    ...split,
    cells: split.cells.map((cell, position) =>
      position >= index && position < index + parts ? { ...cell, id: newId() } : cell
    ),
  }
}

export function cellLayout(doc: CellDoc): CellLayout {
  const text = joinCells(doc)
  const paragraphStarts = cellStarts(paragraphCells(text)).slice(1)
  const starts = cellStarts(doc)
    .map((start, index) => start + (doc.cells[index]!.text.length - doc.cells[index]!.text.trimStart().length))
    .filter((_, index) => index > 0 && doc.cells[index]!.text.trim() !== '')
  return {
    splits: starts.filter(start => !paragraphStarts.includes(start)).map(start => anchorAt(text, start)),
    joins: paragraphStarts.filter(start => !starts.includes(start)).map(start => anchorAt(text, start)),
  }
}

function anchorAt(text: string, start: number): string {
  const lineEnd = text.indexOf('\n', start)
  let end = Math.min(lineEnd === -1 ? text.length : lineEnd, start + ANCHOR_LENGTH)
  while (text.indexOf(text.slice(start, end)) !== start && end < text.length) end++
  return text.slice(start, end)
}

export function keepIds(previous: CellDoc, next: CellDoc): CellDoc {
  return { ...next, cells: next.cells.map((cell, index) => ({ ...cell, id: previous.cells[index]?.id ?? cell.id })) }
}

export function placeIssues(issues: Issue[], doc: CellDoc): PlacedIssues {
  const starts = cellStarts(doc)
  const placed: PlacedIssues = { document: [], cells: doc.cells.map(() => ({ words: [], notes: [], missing: [] })) }
  for (const issue of issues) {
    if (issue.scope === 'document') {
      placed.document.push(issue)
      continue
    }
    const index = cellIndexOf(doc, starts, issue)
    const start = starts[index]!
    const feedback = placed.cells[index]!
    const inside = issue.offset >= start && issue.offset + issue.length <= start + doc.cells[index]!.text.length
    if (issue.scope === 'cell') feedback.notes.push(issue)
    else if (issue.scope === 'missing') feedback.missing.push(issue)
    else feedback.words.push(inside ? issue : { ...issue, replacements: [] })
  }
  return placed
}

export function cellIndexOf(doc: CellDoc, starts: number[], issue: Issue): number {
  const index = cellIndexAt(starts, issue.offset)
  const next = starts[index + 1]
  const startsInGap = issue.offset >= starts[index]! + doc.cells[index]!.text.length
  return next !== undefined && startsInGap && issue.offset + issue.length > next ? index + 1 : index
}
