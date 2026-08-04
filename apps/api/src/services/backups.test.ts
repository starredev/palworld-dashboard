import { describe, expect, it } from 'vitest'
import type { BackupEntry } from '@tsuki/types'
import { backupsToPrune } from './backups'

const entry = (name: string): BackupEntry => ({
  name,
  size: 1,
  createdAt: '2026-08-05T00:00:00.000Z',
})

describe('backupsToPrune', () => {
  // listBackups returns newest-first, so index 0 is the newest.
  const auto = ['auto-5', 'auto-4', 'auto-3', 'auto-2', 'auto-1'].map(entry)

  it('keeps the newest N and prunes the rest', () => {
    expect(backupsToPrune(auto, 'auto', 3)).toEqual(['auto-2', 'auto-1'])
  })

  it('prunes nothing when under the limit', () => {
    expect(backupsToPrune(auto, 'auto', 10)).toEqual([])
  })

  it('only touches the given prefix', () => {
    const mixed = [entry('backup-1'), entry('auto-2'), entry('pre-restore-1'), entry('auto-1')]
    expect(backupsToPrune(mixed, 'auto', 1)).toEqual(['auto-1'])
  })
})
