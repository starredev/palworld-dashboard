import { describe, expect, it } from 'vitest'
import { addItemToContainer } from './save-inventory'

const GUID = 'aaaa1111-0000-0000-0000-000000000000'

function slot(staticId: string, count: number) {
  return { RawData: { value: { count, item: { static_id: staticId } } } }
}
function levelJson(slots: unknown[]) {
  return {
    properties: {
      worldSaveData: {
        value: {
          ItemContainerSaveData: {
            value: [
              { key: { ID: { value: GUID } }, value: { Slots: { value: { values: slots } } } },
            ],
          },
        },
      },
    },
  }
}

describe('addItemToContainer', () => {
  it('stacks onto an existing slot of the same item', () => {
    const json = levelJson([slot('Wood', 10), slot('Stone', 5)])
    addItemToContainer(json, GUID.replace(/-/g, ''), 'Wood', 40)
    const slots = json.properties.worldSaveData.value.ItemContainerSaveData.value[0].value.Slots
      .value.values as { RawData: { value: { count: number; item: { static_id: string } } } }[]
    expect(slots[0].RawData.value.count).toBe(50)
  })

  it('fills an empty (None) slot in place', () => {
    const json = levelJson([slot('Wood', 10), slot('None', 0)])
    addItemToContainer(json, GUID.replace(/-/g, ''), 'PalSphere', 32)
    const slots = json.properties.worldSaveData.value.ItemContainerSaveData.value[0].value.Slots
      .value.values as { RawData: { value: { count: number; item: { static_id: string } } } }[]
    expect(slots[1].RawData.value.item.static_id).toBe('PalSphere')
    expect(slots[1].RawData.value.count).toBe(32)
  })

  it('throws when the container is full', () => {
    const json = levelJson([slot('Wood', 10)])
    expect(() => addItemToContainer(json, GUID.replace(/-/g, ''), 'Stone', 1)).toThrow(/full/i)
  })

  it('throws when the container GUID is not found', () => {
    const json = levelJson([slot('None', 0)])
    expect(() => addItemToContainer(json, 'deadbeef', 'Wood', 1)).toThrow(/not found/i)
  })
})
