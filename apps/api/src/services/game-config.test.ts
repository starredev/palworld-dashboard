import { describe, expect, it } from 'vitest'
import { replaceOptionSettings } from './game-config'

describe('replaceOptionSettings', () => {
  it('replaces the body in place, preserving surrounding text', () => {
    const content =
      '[/Script/Pal.PalGameWorldSettings]\nOptionSettings=(ExpRate=1.000000,bIsPvP=False)\n'
    const out = replaceOptionSettings(content, 'ExpRate=2.000000,bIsPvP=True')
    expect(out).toBe(
      '[/Script/Pal.PalGameWorldSettings]\nOptionSettings=(ExpRate=2.000000,bIsPvP=True)\n',
    )
  })

  it('handles nested parens in the existing body', () => {
    const content = 'OptionSettings=(CrossplayPlatforms=(Steam,Xbox),ExpRate=1.000000)'
    const out = replaceOptionSettings(content, 'ExpRate=2.000000')
    expect(out).toBe('OptionSettings=(ExpRate=2.000000)')
  })

  it('adds the line when only the section header exists', () => {
    const out = replaceOptionSettings('[/Script/Pal.PalGameWorldSettings]\n', 'ExpRate=3.000000')
    expect(out).toContain('OptionSettings=(ExpRate=3.000000)')
  })

  it('creates the section when the file is empty', () => {
    const out = replaceOptionSettings('', 'ExpRate=1.000000')
    expect(out).toContain('[/Script/Pal.PalGameWorldSettings]')
    expect(out).toContain('OptionSettings=(ExpRate=1.000000)')
  })
})
