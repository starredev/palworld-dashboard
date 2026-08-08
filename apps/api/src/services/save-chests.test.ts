import { describe, expect, it } from 'vitest'
import { unlockChestMutate } from './save-chests'

// Minimal Level.sav shape: worldSaveData.value.MapObjectSaveData is an
// ArrayProperty (.value.values), each entry a map object whose ConcreteModel
// carries a ModuleMap with a PasswordLock module.
function chestEntry(instanceId: string, password: string) {
  return {
    MapObjectId: { value: 'ItemChest_02' },
    Model: { value: { RawData: { value: { instance_id: instanceId } } } },
    ConcreteModel: {
      value: {
        ModuleMap: {
          value: [
            {
              key: 'EPalMapObjectConcreteModelModuleType::PasswordLock',
              value: {
                RawData: {
                  value: {
                    lock_state: password ? 0 : 1,
                    password,
                    player_infos: password ? [{ player_uid: 'a-b-c' }] : [],
                  },
                },
              },
            },
          ],
        },
      },
    },
  }
}
function levelJson(entries: unknown[]) {
  return {
    properties: {
      worldSaveData: {
        value: { MapObjectSaveData: { value: { values: entries } } },
      },
    },
  }
}
function lockOf(json: ReturnType<typeof levelJson>, i: number) {
  const entry = json.properties.worldSaveData.value.MapObjectSaveData.value.values[i] as ReturnType<
    typeof chestEntry
  >
  return entry.ConcreteModel.value.ModuleMap.value[0].value.RawData.value
}

describe('unlockChestMutate', () => {
  it('clears the password, unlock list and resets lock_state', () => {
    const json = levelJson([chestEntry('1111-2222', ''), chestEntry('aaaa-bbbb', '1601')])
    unlockChestMutate(json, 'aaaabbbb')
    expect(lockOf(json, 1)).toEqual({ lock_state: 1, password: '', player_infos: [] })
    // Untouched chest stays as-is.
    expect(lockOf(json, 0).lock_state).toBe(1)
  })

  it('matches chest ids irrespective of dashes/case', () => {
    const json = levelJson([chestEntry('AAAA-BBBB-CCCC', 'pass')])
    unlockChestMutate(json, 'aaaabbbbcccc')
    expect(lockOf(json, 0).password).toBe('')
  })

  it('throws when the chest id is not found', () => {
    const json = levelJson([chestEntry('aaaa-bbbb', '1601')])
    expect(() => unlockChestMutate(json, 'deadbeef')).toThrow(/not found/i)
  })

  it('throws when the chest has no password-lock module', () => {
    const bare = {
      MapObjectId: { value: 'ItemChest' },
      Model: { value: { RawData: { value: { instance_id: 'no-lock' } } } },
      ConcreteModel: { value: { ModuleMap: { value: [] } } },
    }
    const json = levelJson([bare])
    expect(() => unlockChestMutate(json, 'nolock')).toThrow(/no password lock/i)
  })
})
