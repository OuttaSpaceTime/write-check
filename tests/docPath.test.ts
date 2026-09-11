import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveDocPath } from '../lib/docPath'

const dataRoot = path.join(process.cwd(), 'data')

describe('resolveDocPath', () => {
  it('falls back to the legacy file at the data root', () => {
    expect(resolveDocPath(null, 'document.md')).toBe(path.join(dataRoot, 'document.md'))
    expect(resolveDocPath('', 'review.json')).toBe(path.join(dataRoot, 'review.json'))
  })

  it('resolves a per-check directory below data/', () => {
    expect(resolveDocPath('checks/2026-09-10-hyprland-post', 'document.md')).toBe(
      path.join(dataRoot, 'checks', '2026-09-10-hyprland-post', 'document.md')
    )  })

  it('rejects a path that escapes data/', () => {
    expect(resolveDocPath('..', 'document.md')).toBeNull()
    expect(resolveDocPath('checks/../../secrets', 'document.md')).toBeNull()
    expect(resolveDocPath('/etc', 'document.md')).toBeNull()
  })
})
