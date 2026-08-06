import { describe, expect, it } from 'vitest'
import { setTechPoints } from './save-player-fields'

/** Minimal palworld-save-tools-shaped player save. */
function playerSave() {
  return {
    properties: {
      Timestamp: { value: 638_000_000_000_000_000, type: 'Int64Property' },
      SaveData: {
        value: {
          TechnologyPoint: { value: 5, type: 'IntProperty' },
          bossTechnologyPoint: { value: 1, type: 'IntProperty' },
          UnlockedRecipeTechnologyNames: {
            value: { values: ['Recipe_A', 'Recipe_B', 'Recipe_C'] },
            type: 'ArrayProperty',
          },
        },
      },
    },
  }
}

describe('setTechPoints', () => {
  it('sets both tech point fields in place', () => {
    const save = playerSave()
    setTechPoints(save, { technologyPoint: 999, bossTechnologyPoint: 50 })
    expect(save.properties.SaveData.value.TechnologyPoint.value).toBe(999)
    expect(save.properties.SaveData.value.bossTechnologyPoint.value).toBe(50)
  })

  it('sets only the provided field', () => {
    const save = playerSave()
    setTechPoints(save, { technologyPoint: 100 })
    expect(save.properties.SaveData.value.TechnologyPoint.value).toBe(100)
    expect(save.properties.SaveData.value.bossTechnologyPoint.value).toBe(1)
  })

  it('throws (never silent no-op) when the field is missing', () => {
    const save = { properties: { SaveData: { value: {} } } }
    expect(() => setTechPoints(save, { technologyPoint: 10 })).toThrow(/TechnologyPoint/)
  })
})
