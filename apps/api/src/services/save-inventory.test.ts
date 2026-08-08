import { describe, expect, it } from 'vitest'
import { addItemToContainer } from './save-inventory'

const GUID = 'aaaa1111-0000-0000-0000-000000000000'
const ZERO = '00000000-0000-0000-0000-000000000000'

// An occupied slot, shaped like a real decoded item-container slot: a packed
// RawData payload (slot_index/count/item/trailing_bytes) plus CustomVersionData.
function slot(staticId: string, count: number, slotIndex = 0) {
  return {
    RawData: {
      value: {
        slot_index: slotIndex,
        count,
        item: {
          static_id: staticId,
          dynamic_id: { created_world_id: ZERO, local_id_in_created_world: ZERO },
        },
        trailing_bytes: [0, 0, 0, 0],
      },
    },
    CustomVersionData: { value: { values: [1, 2, 3] } },
  }
}
// A never-used slot in an older save: empty RawData bytes decode to `null`.
function emptySlot(slotIndex: number) {
  return { SlotIndex: { value: slotIndex }, RawData: { value: null } }
}
function levelJson(slots: unknown[], slotNum?: number) {
  return {
    properties: {
      worldSaveData: {
        value: {
          ItemContainerSaveData: {
            value: [
              {
                key: { ID: { value: GUID } },
                value: {
                  ...(slotNum !== undefined ? { SlotNum: { value: slotNum } } : {}),
                  Slots: { value: { values: slots } },
                },
              },
            ],
          },
        },
      },
    },
  }
}
function slotsOf(json: ReturnType<typeof levelJson>) {
  return json.properties.worldSaveData.value.ItemContainerSaveData.value[0].value.Slots.value
    .values as { RawData: { value: { count: number; item: { static_id: string } } | null } }[]
}

describe('addItemToContainer', () => {
  it('stacks onto an existing slot of the same item', () => {
    const json = levelJson([slot('Wood', 10), slot('Stone', 5, 1)])
    addItemToContainer(json, GUID.replace(/-/g, ''), 'Wood', 40)
    expect(slotsOf(json)[0].RawData.value?.count).toBe(50)
  })

  it('appends a new slot when the container has spare capacity', () => {
    const json = levelJson([slot('Wood', 10, 0)], 42)
    addItemToContainer(json, GUID.replace(/-/g, ''), 'PalSphere', 32)
    const slots = slotsOf(json)
    expect(slots).toHaveLength(2)
    expect(slots[1].RawData.value).toMatchObject({
      slot_index: 1,
      count: 32,
      item: {
        static_id: 'PalSphere',
        dynamic_id: { created_world_id: ZERO, local_id_in_created_world: ZERO },
      },
      trailing_bytes: [0, 0, 0, 0],
    })
    // Cloned structural fields survive (needed to re-encode the slot).
    expect((slots[1] as unknown as { CustomVersionData: unknown }).CustomVersionData).toBeDefined()
  })

  it('fills the lowest free index, into an empty container, using a template from elsewhere', () => {
    const json = levelJson([], 6)
    // A second container provides the clone template.
    json.properties.worldSaveData.value.ItemContainerSaveData.value.push({
      key: { ID: { value: '0000-other' } },
      value: { Slots: { value: { values: [slot('Wood', 1, 0)] } } },
    } as never)
    addItemToContainer(json, GUID.replace(/-/g, ''), 'Coal', 100)
    const slots = slotsOf(json)
    expect(slots).toHaveLength(1)
    expect(slots[0].RawData.value).toMatchObject({ slot_index: 0, count: 100 })
  })

  it('fills an empty (None) slot in place', () => {
    const json = levelJson([slot('Wood', 10), slot('None', 0, 1)])
    addItemToContainer(json, GUID.replace(/-/g, ''), 'PalSphere', 32)
    const slots = slotsOf(json)
    expect(slots[1].RawData.value?.item.static_id).toBe('PalSphere')
    expect(slots[1].RawData.value?.count).toBe(32)
  })

  it('fills a never-used slot (null RawData) with a packed item value', () => {
    const json = levelJson([slot('Wood', 10), emptySlot(1)])
    addItemToContainer(json, GUID.replace(/-/g, ''), 'PalSphere', 32)
    expect(slotsOf(json)[1].RawData.value).toMatchObject({
      slot_index: 1,
      count: 32,
      item: { static_id: 'PalSphere' },
    })
  })

  it('stacks onto an existing item even when earlier slots are empty', () => {
    const json = levelJson([emptySlot(0), slot('Wood', 10, 1)])
    addItemToContainer(json, GUID.replace(/-/g, ''), 'Wood', 5)
    const slots = slotsOf(json)
    expect(slots[1].RawData.value?.count).toBe(15)
    expect(slots[0].RawData.value).toBeNull()
  })

  it('throws when every slot index up to SlotNum is used', () => {
    const json = levelJson([slot('Wood', 10, 0), slot('Stone', 5, 1)], 2)
    expect(() => addItemToContainer(json, GUID.replace(/-/g, ''), 'Coal', 1)).toThrow(/full/i)
  })

  it('throws when capacity is unknown and there is no free slot', () => {
    const json = levelJson([slot('Wood', 10)])
    expect(() => addItemToContainer(json, GUID.replace(/-/g, ''), 'Stone', 1)).toThrow(/full/i)
  })

  it('throws when the container GUID is not found', () => {
    const json = levelJson([slot('None', 0)])
    expect(() => addItemToContainer(json, 'deadbeef', 'Wood', 1)).toThrow(/not found/i)
  })
})
