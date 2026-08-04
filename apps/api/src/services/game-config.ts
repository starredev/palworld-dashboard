import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { loadEnv } from '../config/env'

const SECTION = '[/Script/Pal.PalGameWorldSettings]'
const MARKER = 'OptionSettings=('

function iniPath(): string {
  return loadEnv().PALWORLD_INI_PATH
}

/** True when the ini file is mounted and readable — gates the whole feature. */
export function isConfigAvailable(): boolean {
  return existsSync(iniPath())
}

export function readConfigFile(): string | null {
  const path = iniPath()
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

/** Replace the OptionSettings(...) segment in-place, preserving everything else. */
export function replaceOptionSettings(content: string, body: string): string {
  const line = `OptionSettings=(${body})`
  const start = content.indexOf(MARKER)
  if (start === -1) {
    return content.includes(SECTION) ? `${content.trimEnd()}\n${line}\n` : `${SECTION}\n${line}\n`
  }
  let depth = 0
  for (let i = start + MARKER.length - 1; i < content.length; i++) {
    if (content[i] === '(') depth++
    else if (content[i] === ')' && --depth === 0) {
      return content.slice(0, start) + line + content.slice(i + 1)
    }
  }
  return content // unbalanced parens — refuse to mangle
}

/** Back up the current file, then write the new OptionSettings body. */
export function writeConfigFile(body: string): string {
  const path = iniPath()
  const current = existsSync(path) ? readFileSync(path, 'utf8') : `${SECTION}\n`
  const updated = replaceOptionSettings(current, body)
  if (existsSync(path)) copyFileSync(path, `${path}.bak`)
  writeFileSync(path, updated, 'utf8')
  return path
}
