import { describe, expect, it } from 'vitest'
import { markEdits, type EditMark } from '../lib/edits'

const marked = (text: string, marks: EditMark[]) => marks.map(mark => text.slice(mark.offset, mark.offset + mark.length))

const markOn = (text: string, words: string): EditMark => ({ offset: text.indexOf(words), length: words.length })

describe('markEdits', () => {
  it('marks a rewritten phrase as one stretch', () => {
    const before = 'The tool makes a claim about speed.\n\nNext.'
    const after = 'The tool answers in under 200 ms.\n\nNext.'
    expect(marked(after, markEdits(before, after, []))).toEqual(['answers in under 200 ms'])
  })

  it('marks nothing when the text is unchanged', () => {
    expect(markEdits('Same text.', 'Same text.', [])).toEqual([])
  })

  it('marks nothing when the document was empty before', () => {
    expect(markEdits('', 'A whole first draft.', [])).toEqual([])
  })

  it('keeps an earlier mark between two new edits, shifted', () => {
    const before = 'Alpha one.\n\nBeta two.\n\nGamma three.'
    const after = 'Alpha uno.\n\nBeta two.\n\nGamma tres.'
    expect(marked(after, markEdits(before, after, [markOn(before, 'two')]))).toEqual(['uno', 'two', 'tres'])
  })

  it('keeps the rest of an earlier mark when a word inside it changes', () => {
    const before = 'The tool answers in under 200 ms.'
    const after = 'The tool answers in under 150 ms.'
    expect(marked(after, markEdits(before, after, [markOn(before, 'answers in under 200 ms')]))).toEqual([
      'answers in under 150 ms',
    ])
  })

  it('adds no mark for a deletion and shifts the later marks', () => {
    const before = 'One two three. Four.'
    const after = 'One three. Four.'
    expect(marked(after, markEdits(before, after, [markOn(before, 'Four')]))).toEqual(['Four'])
  })

  it('leaves paragraph breaks out of marks and never joins paragraphs', () => {
    const before = 'A b c.\n\nD e f.'
    const after = 'A b X.\n\nD e f.\n\nNew paragraph here.'
    expect(marked(after, markEdits(before, after, []))).toEqual(['X', 'New paragraph here.'])
  })

  it('marks each of several new paragraphs on its own', () => {
    const after = 'Intro.\n\nFirst new paragraph.\n\nSecond new paragraph.'
    expect(marked(after, markEdits('Intro.', after, []))).toEqual(['First new paragraph.', 'Second new paragraph.'])
  })

  it('marks nothing for a change in whitespace only', () => {
    expect(markEdits('A b.\n\nC d.', 'A b.\n\n\nC d.', [])).toEqual([])
  })
})
