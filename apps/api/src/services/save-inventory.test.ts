import { describe, expect, it } from 'vitest'
import {
  addItemToContainer,
  removeItemFromContainers,
  transferItemMutate,
} from './save-inventory'

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

const hex = (g: string) => g.replace(/-/g, '')

describe('removeItemFromContainers', () => {
  it('decrements a stack and leaves the slot occupied when some remain', () => {
    const json = levelJson([slot('Wood', 50)])
    removeItemFromContainers(json, [hex(GUID)], 'Wood', 20)
    expect(slotsOf(json)[0].RawData.value?.count).toBe(30)
    expect(slotsOf(json)[0].RawData.value?.item.static_id).toBe('Wood')
  })

  it('empties a slot (None, 0) when the whole stack is removed', () => {
    const json = levelJson([slot('Wood', 20)])
    removeItemFromContainers(json, [hex(GUID)], 'Wood', 20)
    const raw = slotsOf(json)[0].RawData.value
    expect(raw?.count).toBe(0)
    expect(raw?.item.static_id).toBe('None')
  })

  it('draws from multiple slots of the same item across the container', () => {
    const json = levelJson([slot('Arrow', 30, 0), slot('Arrow', 30, 1)])
    removeItemFromContainers(json, [hex(GUID)], 'Arrow', 45)
    const [a, b] = slotsOf(json)
    expect(a.RawData.value?.item.static_id).toBe('None')
    expect(a.RawData.value?.count).toBe(0)
    expect(b.RawData.value?.count).toBe(15)
  })

  it('throws (without mutating) when the player has too few', () => {
    const json = levelJson([slot('Wood', 5)])
    expect(() => removeItemFromContainers(json, [hex(GUID)], 'Wood', 10)).toThrow(/not enough/i)
    expect(slotsOf(json)[0].RawData.value?.count).toBe(5)
  })
})

describe('transferItemMutate', () => {
  const SRC = 'aaaa1111-0000-0000-0000-000000000000'
  const DST = 'bbbb2222-0000-0000-0000-000000000000'

  // Two containers in one Level.sav: source (SRC) and target (DST).
  function twoContainers(srcSlots: unknown[], dstSlots: unknown[], dstSlotNum?: number) {
    return {
      properties: {
        worldSaveData: {
          value: {
            ItemContainerSaveData: {
              value: [
                { key: { ID: { value: SRC } }, value: { Slots: { value: { values: srcSlots } } } },
                {
                  key: { ID: { value: DST } },
                  value: {
                    ...(dstSlotNum !== undefined ? { SlotNum: { value: dstSlotNum } } : {}),
                    Slots: { value: { values: dstSlots } },
                  },
                },
              ],
            },
          },
        },
      },
    }
  }
  const slotsAt = (json: unknown, i: number) =>
    (json as ReturnType<typeof twoContainers>).properties.worldSaveData.value.ItemContainerSaveData
      .value[i].value.Slots.value.values as {
      RawData: { value: { count: number; item: { static_id: string } } | null }
    }[]

  it('moves items out of the source and into the target (stacking)', () => {
    const json = twoContainers([slot('Wood', 50)], [slot('Wood', 10)])
    transferItemMutate(json, [hex(SRC)], hex(DST), 'Wood', 30)
    expect(slotsAt(json, 0)[0].RawData.value?.count).toBe(20) // source drained
    expect(slotsAt(json, 1)[0].RawData.value?.count).toBe(40) // target gained
  })

  it('appends a new target slot when the item is new to the target', () => {
    const json = twoContainers([slot('PalSphere', 32)], [slot('Wood', 1, 0)], 10)
    transferItemMutate(json, [hex(SRC)], hex(DST), 'PalSphere', 32)
    expect(slotsAt(json, 0)[0].RawData.value?.item.static_id).toBe('None') // fully moved
    const dst = slotsAt(json, 1)
    expect(dst).toHaveLength(2)
    expect(dst[1].RawData.value).toMatchObject({ count: 32, item: { static_id: 'PalSphere' } })
  })

  it('does not touch the target when the source lacks enough', () => {
    const json = twoContainers([slot('Wood', 5)], [slot('Wood', 10)])
    expect(() => transferItemMutate(json, [hex(SRC)], hex(DST), 'Wood', 20)).toThrow(/not enough/i)
    expect(slotsAt(json, 1)[0].RawData.value?.count).toBe(10) // target unchanged
  })
})
