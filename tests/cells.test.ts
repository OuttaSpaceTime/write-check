import { describe, expect, it } from 'vitest'
import type { Issue } from '../lib/check/types'
import { resolveReviewNotes } from '../lib/review'
import {
  cellIndexAt,
  cellLayout,
  cellStarts,
  deleteCell,
  deriveCells,
  insertCell,
  joinCells,
  keepIds,
  mergeCells,
  placeIssues,
  splitCell,
  splitIntoBlocks,
} from '../lib/cells'

const sample =
  '## Why we moved\n\nIn today\'s world, feedback is crucial. We use runners since 2022.\n\nSelf-hosted runners cut this to 5 minutes. They also cost less.\n\n- no queue\n- warm caches\n\n## Results\n\nMerges wait less.\n'

const texts = (text: string, layout?: Parameters<typeof deriveCells>[1]) =>
  deriveCells(text, layout).cells.map(cell => cell.text)

describe('deriveCells', () => {
  it('makes one cell per paragraph and joins a heading to the block below it', () => {
    expect(texts(sample)).toEqual([
      "## Why we moved\n\nIn today's world, feedback is crucial. We use runners since 2022.",
      'Self-hosted runners cut this to 5 minutes. They also cost less.',
      '- no queue\n- warm caches',
      '## Results\n\nMerges wait less.',
    ])
  })

  it('reproduces the text exactly when the cells are joined', () => {
    for (const text of [sample, '', '   \n', '\n\nLead.\n\n\n\nTail.  \n\n', '```js\nconst a = 1\n\n\nconst b = 2\n```\n\nAfter.']) {
      expect(joinCells(deriveCells(text))).toBe(text)
    }
  })

  it('never duplicates text when the parser reports overlapping blocks', () => {
    const text = 'Intro.\n\n[docs]: https://example.com/docs\nOur results\n-----------\n\nBody.'
    expect(joinCells(deriveCells(text))).toBe(text)
  })

  it('keeps a fenced code block with blank lines in one cell', () => {
    expect(texts('Before.\n\n```js\nconst a = 1\n\nconst b = 2\n```\n\nAfter.')).toEqual([
      'Before.',
      '```js\nconst a = 1\n\nconst b = 2\n```',
      'After.',
    ])
  })

  it('chains consecutive headings into the first block that follows them', () => {
    expect(texts('# Title\n\n## Part\n\nBody.\n\nMore.')).toEqual(['# Title\n\n## Part\n\nBody.', 'More.'])
  })

  it('gives an empty document one empty cell', () => {
    const doc = deriveCells('')
    expect(doc.cells.map(cell => cell.text)).toEqual([''])
    expect(joinCells(doc)).toBe('')
  })

  it('keeps a whitespace-only document in a single cell', () => {
    expect(texts('  \n\n ')).toEqual(['  \n\n '])
  })
})

describe('cellStarts and cellIndexAt', () => {
  it('points each start at the first character of its cell', () => {
    const doc = deriveCells(sample)
    const text = joinCells(doc)
    cellStarts(doc).forEach((start, index) => {
      const cell = doc.cells[index]!.text
      expect(text.slice(start, start + cell.length)).toBe(cell)
    })
  })

  it('assigns an offset inside a gap to the cell before the gap', () => {
    const doc = deriveCells('First.\n\nSecond.')
    const starts = cellStarts(doc)
    expect(cellIndexAt(starts, 0)).toBe(0)
    expect(cellIndexAt(starts, 'First.'.length + 1)).toBe(0)
    expect(cellIndexAt(starts, 'First.\n\n'.length)).toBe(1)
  })
})

describe('splitCell', () => {
  const doc = deriveCells('One sentence. Another sentence.')

  it('splits at the position and moves the whitespace there into the gap', () => {
    const split = splitCell(doc, 0, 'One sentence. '.length)
    expect(split.cells.map(cell => cell.text)).toEqual(['One sentence.', 'Another sentence.'])
    expect(joinCells(split)).toBe('One sentence. Another sentence.')
  })

  it('keeps the id of the left cell and gives the right cell a new one', () => {
    const split = splitCell(doc, 0, 'One sentence.'.length)
    expect(split.cells[0]!.id).toBe(doc.cells[0]!.id)
    expect(split.cells[1]!.id).not.toBe(doc.cells[0]!.id)
  })

  it('does nothing when one side would be empty', () => {
    expect(splitCell(doc, 0, 0)).toBe(doc)
    expect(splitCell(doc, 0, doc.cells[0]!.text.length)).toBe(doc)
    expect(splitCell(deriveCells('Text.   '), 0, 'Text. '.length).cells).toHaveLength(1)
  })
})

describe('mergeCells', () => {
  it('shows both cells and the gap between them in one cell without changing the text', () => {
    const doc = deriveCells('First.\n\nSecond.\n\nThird.')
    const merged = mergeCells(doc, 0)
    expect(merged.cells.map(cell => cell.text)).toEqual(['First.\n\nSecond.', 'Third.'])
    expect(merged.cells[0]!.id).toBe(doc.cells[0]!.id)
    expect(joinCells(merged)).toBe('First.\n\nSecond.\n\nThird.')
  })

  it('does nothing for the last cell', () => {
    const doc = deriveCells('Only.')
    expect(mergeCells(doc, 0)).toBe(doc)
  })
})

describe('insertCell and deleteCell', () => {
  it('inserts an empty cell after the given one, separated by a blank line', () => {
    const doc = insertCell(deriveCells('First.\n\nSecond.'), 0)
    expect(doc.cells.map(cell => cell.text)).toEqual(['First.', '', 'Second.'])
    expect(joinCells(doc)).toBe('First.\n\n\n\nSecond.')
  })

  it('keeps a new cell between two sentence cells inside their paragraph', () => {
    const split = splitCell(deriveCells('One sentence. Another sentence.'), 0, 'One sentence. '.length)
    const inserted = insertCell(split, 0)
    const typed = { ...inserted, cells: inserted.cells.map((cell, i) => (i === 1 ? { ...cell, text: 'New thought.' } : cell)) }
    expect(joinCells(typed)).toBe('One sentence. New thought. Another sentence.')
  })

  it('appends a cell at the end without losing the trailing newline', () => {
    const doc = insertCell(deriveCells('Only.\n'), 0)
    expect(joinCells({ ...doc, cells: doc.cells.map((cell, i) => (i === 1 ? { ...cell, text: 'New.' } : cell)) })).toBe(
      'Only.\n\nNew.\n'
    )
  })

  it('deletes a cell together with the gap before it', () => {
    const doc = insertCell(deriveCells('First.\n\nSecond.'), 0)
    expect(joinCells(deleteCell(doc, 1))).toBe('First.\n\nSecond.')
  })

  it('keeps the paragraph break when deleting the first sentence cell of a paragraph', () => {
    const doc = splitCell(deriveCells('Intro.\n\nFirst sentence. Second sentence.\n'), 1, 'First sentence. '.length)
    expect(joinCells(deleteCell(doc, 1))).toBe('Intro.\n\nSecond sentence.\n')
    expect(joinCells(deleteCell(doc, 0))).toBe('First sentence. Second sentence.\n')
    expect(joinCells(deleteCell(deriveCells('Intro.\n\nLast.\n'), 1))).toBe('Intro.\n')
  })

  it('never deletes the only cell', () => {
    const doc = deriveCells('')
    expect(deleteCell(doc, 0)).toBe(doc)
  })
})

describe('splitIntoBlocks', () => {
  it('splits pasted paragraphs into their own cells, keeping the text', () => {
    const text = 'Before.\n\nPasted one.\n\nPasted two.'
    const doc = { cells: [{ id: 'a', text }, { id: 'b', text: 'Next.' }], gaps: ['', '\n\n', ''] }
    const split = splitIntoBlocks(doc, 0, 'Before.'.length, text.length)
    expect(split.cells.map(cell => cell.text)).toEqual(['Before.', 'Pasted one.', 'Pasted two.', 'Next.'])
    expect(joinCells(split)).toBe(joinCells(doc))
  })

  it('gives every part a new id, so each editor starts from the new text', () => {
    const doc = { cells: [{ id: 'a', text: 'Before.\n\nPasted.' }], gaps: ['', ''] }
    const split = splitIntoBlocks(doc, 0, 'Before.'.length, doc.cells[0]!.text.length)
    expect(split.cells.map(cell => cell.id)).not.toContain('a')
  })

  it('leaves paragraphs outside the pasted range in the same cell', () => {
    const text = 'First para.\n\nSecond para.'
    const doc = { cells: [{ id: 'a', text }], gaps: ['', ''] }
    expect(splitIntoBlocks(doc, 0, 2, 7)).toBe(doc)
  })

  it('moves blank lines around the pasted paragraphs into the gaps', () => {
    const text = 'One.\n\nTwo.\n'
    const doc = { cells: [{ id: 'a', text }], gaps: ['', ''] }
    const split = splitIntoBlocks(doc, 0, 0, text.length)
    expect(split.cells.map(cell => cell.text)).toEqual(['One.', 'Two.\n'])
    expect(joinCells(split)).toBe(text)
  })
})

describe('cellLayout', () => {
  it('is empty for the default paragraph cells', () => {
    expect(cellLayout(deriveCells(sample))).toEqual({ splits: [], joins: [] })
  })

  it('restores a custom split and a custom merge from the text alone', () => {
    let doc = deriveCells(sample)
    doc = splitCell(doc, 1, doc.cells[1]!.text.indexOf('They also'))
    doc = mergeCells(doc, 3)
    const layout = cellLayout(doc)
    expect(layout).toEqual({ splits: ['They also cost less.'], joins: ['## Results'] })
    expect(texts(joinCells(doc), layout)).toEqual(doc.cells.map(cell => cell.text))
  })

  it('keeps a custom split when the text changes elsewhere', () => {
    let doc = deriveCells(sample)
    doc = splitCell(doc, 1, doc.cells[1]!.text.indexOf('They also'))
    const edited = joinCells(doc).replace('Merges wait less.', 'Merges wait much less.')
    expect(texts(edited, cellLayout(doc))).toContain('They also cost less.')
  })

  it('restores a merge of the second of two identical headings', () => {
    const text = 'Intro.\n\n## Example\n\nA.\n\n## Example\n\nB.'
    const merged = mergeCells(deriveCells(text), 1)
    expect(texts(text, cellLayout(merged))).toEqual(merged.cells.map(cell => cell.text))
  })

  it('restores a split before a sentence that also appears earlier', () => {
    const text = 'Setup is slow. It works.\n\nThe fix is small. It works.\n\nDone.'
    const doc = deriveCells(text)
    const split = splitCell(doc, 1, doc.cells[1]!.text.indexOf('It works.'))
    expect(texts(text, cellLayout(split))).toEqual(split.cells.map(cell => cell.text))
  })

  it('falls back to paragraph cells when an anchor is gone', () => {
    const layout = { splits: ['This sentence was deleted.'], joins: ['## Heading that was renamed'] }
    expect(texts(sample, layout)).toEqual(texts(sample))
  })
})

describe('keepIds', () => {
  it('reuses the previous ids by position', () => {
    const previous = deriveCells('A.\n\nB.')
    const next = keepIds(previous, deriveCells('A!\n\nB.\n\nC.'))
    expect(next.cells.slice(0, 2).map(cell => cell.id)).toEqual(previous.cells.map(cell => cell.id))
    expect(new Set(next.cells.map(cell => cell.id)).size).toBe(3)
  })
})

describe('placeIssues', () => {
  const text = 'First paragraph makes a claim.\n\nSecond paragraph wanders off.'
  const wordIssue = (words: string): Issue => ({
    id: words,
    source: 'spelling',
    ruleId: 'TYPO',
    title: words,
    message: '',
    explanation: '',
    replacements: ['fix'],
    offset: text.indexOf(words),
    length: words.length,
    severity: 'error',
  })

  it('puts each finding under the cell that holds its words', () => {
    const placed = placeIssues([wordIssue('claim'), wordIssue('wanders')], deriveCells(text))
    expect(placed.cells.map(cell => cell.words.map(issue => issue.id))).toEqual([['claim'], ['wanders']])
  })

  it('moves feedback along when cells are merged and split again', () => {
    const issues = [wordIssue('claim'), wordIssue('wanders')]
    const merged = mergeCells(deriveCells(text), 0)
    expect(placeIssues(issues, merged).cells.map(cell => cell.words.length)).toEqual([2])
    const split = splitCell(merged, 0, merged.cells[0]!.text.indexOf('Second'))
    expect(placeIssues(issues, split).cells.map(cell => cell.words.map(issue => issue.id))).toEqual([['claim'], ['wanders']])
  })

  it('separates whole-text, whole-cell and missing notes from notes on words', () => {
    const notes = resolveReviewNotes(text, [
      { title: 'Missing: the downside', message: 'x' },
      { quote: 'Second paragraph', scope: 'cell', title: 'No point', message: 'x' },
      { quote: 'makes a claim.', scope: 'missing', title: 'Missing: evidence', message: 'x' },
      { quote: 'gone words', title: 'Stale', message: 'x' },
    ])
    const placed = placeIssues(notes, deriveCells(text))
    expect(placed.document.map(issue => issue.title)).toEqual(['Missing: the downside', 'Stale'])
    expect(placed.cells[0]!.missing.map(issue => issue.title)).toEqual(['Missing: evidence'])
    expect(placed.cells[1]!.notes.map(issue => issue.title)).toEqual(['No point'])
  })

  it('puts a finding that starts in the gap under the cell it runs into', () => {
    const doc = deriveCells(text)
    const gapStart = 'First paragraph makes a claim.'.length
    const issue = { ...wordIssue('claim'), offset: gapStart + 1, length: '\nSecond'.length }
    expect(placeIssues([issue], doc).cells[1]!.words).toHaveLength(1)
  })

  it('drops the fix buttons of a finding that starts before its cell', () => {
    const doc = deriveCells('  - **Speed**: fast')
    const issue = { ...wordIssue('claim'), offset: 0, length: 6 }
    expect(placeIssues([issue], doc).cells[0]!.words[0]!.replacements).toEqual([])
  })

  it('keeps a finding that runs into the next cell but drops its fix buttons', () => {
    const split = splitCell(deriveCells('It works. Then breaks.'), 0, 'It works. '.length)
    const crossing = { ...wordIssue('claim'), offset: 'It '.length, length: 'works. Then'.length }
    const placed = placeIssues([crossing], split)
    expect(placed.cells[0]!.words[0]!.replacements).toEqual([])
  })
})
