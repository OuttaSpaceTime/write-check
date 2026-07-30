import { describe, expect, it } from 'vitest'
import { splitSections } from '../lib/sections'

describe('splitSections', () => {
  it('returns the whole document when there are no headings', () => {
    expect(splitSections('just text')).toEqual([{ title: 'Document', offset: 0, length: 9 }])
  })

  it('splits at headings and captures the intro', () => {
    const text = 'Intro paragraph.\n\n# First\n\nBody one.\n\n## Second\n\nBody two.'
    const sections = splitSections(text)
    expect(sections.map(section => section.title)).toEqual(['Introduction', 'First', 'Second'])
    const first = sections[1]!
    const slice = text.slice(first.offset, first.offset + first.length)
    expect(slice).toContain('# First')
    expect(slice).toContain('Body one.')
    expect(slice).not.toContain('Second')
  })

  it('covers the full document without gaps', () => {
    const text = '# A\n\ntext a\n\n# B\n\ntext b'
    const sections = splitSections(text)
    const total = sections.reduce((sum, section) => sum + section.length, 0)
    expect(total).toBe(text.length)
  })

  it('extracts heading titles containing inline code', () => {
    const sections = splitSections('# Use `npm install` now\n\nbody')
    expect(sections[0]!.title).toBe('Use npm install now')
  })
})
