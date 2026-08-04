import { describe, expect, it } from 'vitest'
import { parseBody, parseConfig, toBody, unquote } from './serialize'
import { DEFAULT_OPTION_SETTINGS } from './default-ini'

describe('config serialize', () => {
  it('round-trips the default body exactly', () => {
    expect(toBody(parseBody(DEFAULT_OPTION_SETTINGS))).toBe(DEFAULT_OPTION_SETTINGS)
  })

  it('keeps quoted values with commas intact', () => {
    const body = 'ServerName="Hello, World",ExpRate=1.000000'
    const parsed = parseBody(body)
    expect(parsed.values.ServerName).toBe('"Hello, World"')
    expect(unquote(parsed.values.ServerName)).toBe('Hello, World')
  })

  it('parses nested platform tuples as one value', () => {
    const parsed = parseBody('CrossplayPlatforms=(Steam,Xbox,PS5,Mac),ExpRate=2.000000')
    expect(parsed.order).toEqual(['CrossplayPlatforms', 'ExpRate'])
    expect(parsed.values.CrossplayPlatforms).toBe('(Steam,Xbox,PS5,Mac)')
  })

  it('extracts OptionSettings from a full pasted ini', () => {
    const ini = `[/Script/Pal.PalGameWorldSettings]\nOptionSettings=(ExpRate=3.000000,bIsPvP=True)\n`
    const parsed = parseConfig(ini)
    expect(parsed?.values.ExpRate).toBe('3.000000')
    expect(parsed?.values.bIsPvP).toBe('True')
  })

  it('preserves unknown keys through a round-trip', () => {
    const parsed = parseBody(DEFAULT_OPTION_SETTINGS)
    expect(parsed.values.BuildingNameDisplayCacheTTLSeconds).toBe('60')
  })
})
