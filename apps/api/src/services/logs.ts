import { closeSync, existsSync, openSync, readSync, statSync } from 'node:fs'
import { loadEnv } from '../config/env'

const MAX_READ = 512 * 1024

function logPath(): string {
  return loadEnv().PALWORLD_LOG_PATH
}

export function isLogAvailable(): boolean {
  return existsSync(logPath())
}

/** Read the last `maxLines` lines of the log without loading the whole file. */
export function tailLog(maxLines: number): string[] {
  const path = logPath()
  if (!existsSync(path)) return []
  const size = statSync(path).size
  if (size === 0) return []

  const chunk = Math.min(size, MAX_READ)
  const buf = Buffer.alloc(chunk)
  const fd = openSync(path, 'r')
  try {
    readSync(fd, buf, 0, chunk, size - chunk)
  } finally {
    closeSync(fd)
  }

  const lines = buf.toString('utf8').split(/\r?\n/)
  // Drop a leading partial line if we started mid-file.
  if (chunk < size) lines.shift()
  return lines.filter((l) => l.length > 0).slice(-maxLines)
}
