import { describe, expect, it } from 'vitest'
import { locateTranslation, readLocation, setLocation } from './save-location'

/** Minimal palworld-save-tools-shaped player save with a LastTransform. */
function playerSave(x: number, y: number, z: number) {
  return {
    properties: {
      SaveData: {
        value: {
          LastTransform: {
            type: 'StructProperty',
            struct_type: 'Transform',
            value: {
              Rotation: { value: { x: 0, y: 0, z: 0, w: 1 } },
              Translation: { struct_type: 'Vector', value: { x, y, z } },
              Scale3D: { value: { x: 1, y: 1, z: 1 } },
            },
          },
        },
      },
    },
  }
}

describe('locateTranslation', () => {
  it('finds the Translation vector regardless of parent nesting', () => {
    const vec = locateTranslation(playerSave(-368214, 162204, 5000))
    expect(vec).toEqual({ x: -368214, y: 162204, z: 5000 })
  })

  it('returns null when LastTransform is absent', () => {
    expect(locateTranslation({ properties: { foo: { value: 1 } } })).toBeNull()
  })

  it('returns null when Translation is malformed', () => {
    const save = { LastTransform: { value: { Translation: { value: { x: 'nope' } } } } }
    expect(locateTranslation(save)).toBeNull()
  })
})

describe('readLocation', () => {
  it('returns a copy of the coordinates', () => {
    expect(readLocation(playerSave(1, 2, 3))).toEqual({ x: 1, y: 2, z: 3 })
  })
})

describe('setLocation', () => {
  it('writes x/y/z through to the parsed save in place', () => {
    const save = playerSave(0, 0, 0)
    setLocation(save, { x: -792296, y: -94580, z: 1234 })
    expect(readLocation(save)).toEqual({ x: -792296, y: -94580, z: 1234 })
  })

  it('throws (never silently no-ops) when the field is missing', () => {
    expect(() => setLocation({ nothing: true }, { x: 1, y: 2, z: 3 })).toThrow(/LastTransform/)
  })
})
