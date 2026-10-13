import { diffWordsWithSpace } from 'diff'

export type EditMark = { offset: number; length: number }

export function markEdits(before: string, after: string, marks: EditMark[]): EditMark[] {
  if (before === '') return []
  const pieces: EditMark[] = []
  let oldStart = 0
  let newStart = 0
  for (const part of diffWordsWithSpace(before, after)) {
    const length = part.value.length
    if (part.added) pieces.push({ offset: newStart, length })
    if (!part.added && !part.removed) {
      for (const mark of marks) {
        const from = Math.max(mark.offset, oldStart)
        const to = Math.min(mark.offset + mark.length, oldStart + length)
        if (to > from) pieces.push({ offset: from - oldStart + newStart, length: to - from })
      }
    }
    if (!part.added) oldStart += length
    if (!part.removed) newStart += length
  }
  return joinOnOneLine(after, pieces)
}

function joinOnOneLine(text: string, pieces: EditMark[]): EditMark[] {
  const joined: EditMark[] = []
  for (const piece of pieces.sort((a, b) => a.offset - b.offset)) {
    const last = joined[joined.length - 1]
    if (last && /^[ \t]*$/.test(text.slice(last.offset + last.length, piece.offset))) {
      last.length = Math.max(last.length, piece.offset + piece.length - last.offset)
    } else {
      joined.push({ ...piece })
    }
  }
  return joined.flatMap(mark =>
    [...text.slice(mark.offset, mark.offset + mark.length).matchAll(/[^\n]+/g)].flatMap(line => {
      const words = line[0].trim()
      const start = mark.offset + line.index + line[0].length - line[0].trimStart().length
      return words ? [{ offset: start, length: words.length }] : []
    })
  )
}
