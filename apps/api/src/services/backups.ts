import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import AdmZip from 'adm-zip'
import type { BackupEntry } from '@tsuki/types'
import { loadEnv } from '../config/env'

const NAME_RE = /^[\w.-]+\.zip$/

function saveDir(): string {
  return loadEnv().PALWORLD_SAVE_DIR
}
function backupDir(): string {
  return loadEnv().BACKUP_DIR
}

/** Backups need the save games dir mounted; otherwise the feature is hidden. */
export function isBackupAvailable(): boolean {
  return existsSync(saveDir())
}

/** Resolve + validate a backup file path, refusing anything outside BACKUP_DIR. */
export function backupPath(name: string): string {
  if (!NAME_RE.test(name)) throw new Error('Invalid backup name')
  return join(backupDir(), name)
}

export function listBackups(): BackupEntry[] {
  const dir = backupDir()
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.zip'))
    .map((name) => {
      const stat = statSync(join(dir, name))
      return { name, size: stat.size, createdAt: stat.mtime.toISOString() }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
}

export function createBackup(prefix = 'backup'): BackupEntry {
  mkdirSync(backupDir(), { recursive: true })
  const name = `${prefix}-${stamp()}.zip`
  const zip = new AdmZip()
  zip.addLocalFolder(saveDir())
  zip.writeZip(join(backupDir(), name))
  const stat = statSync(join(backupDir(), name))
  return { name, size: stat.size, createdAt: stat.mtime.toISOString() }
}

export function deleteBackup(name: string): void {
  const path = backupPath(name)
  if (existsSync(path)) rmSync(path)
}

/** Names of prefixed backups beyond the newest `keep` (entries sorted newest-first). */
export function backupsToPrune(entries: BackupEntry[], prefix: string, keep: number): string[] {
  return entries
    .filter((e) => e.name.startsWith(`${prefix}-`))
    .slice(keep)
    .map((e) => e.name)
}

/** Create an auto-backup and prune old ones beyond the retention count. */
export function createAutoBackup(retention: number): BackupEntry {
  const entry = createBackup('auto')
  for (const name of backupsToPrune(listBackups(), 'auto', retention)) deleteBackup(name)
  return entry
}

/** Restore a backup over the live saves, taking a safety backup first. */
export function restoreBackup(name: string): void {
  const path = backupPath(name)
  if (!existsSync(path)) throw new Error('Backup not found')
  createBackup('pre-restore')
  const zip = new AdmZip(path)
  zip.extractAllTo(saveDir(), true)
}
