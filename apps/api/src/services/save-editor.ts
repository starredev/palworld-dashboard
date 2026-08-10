import { execFile } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { loadEnv } from '../config/env'

const run = promisify(execFile)

const JSON_SUFFIX = '.json'
// v0.24.0 ships the converter as a package module (not a root convert.py). Run
// it as a module from the vendored dir so `palworld_save_tools` is importable.
const CONVERT_MODULE = 'palworld_save_tools.commands.convert'
const CONVERT_REL = join('palworld_save_tools', 'commands', 'convert.py')

/** Usable only when the converter is vendored AND the save dir is mounted. */
export function isSaveEditorAvailable(): boolean {
  const env = loadEnv()
  return existsSync(join(env.SAVE_TOOLS_DIR, CONVERT_REL)) && existsSync(env.PALWORLD_SAVE_DIR)
}

/** Run the converter one way; the caller states the exact output path. */
async function convert(
  inputPath: string,
  outputPath: string,
  direction: '--to-json' | '--from-json',
): Promise<string> {
  if (!existsSync(inputPath)) throw new Error(`Save file not found: ${inputPath}`)
  const env = loadEnv()
  // `--force` overwrites a stale target AND skips the tool's interactive y/n
  // confirm (which would hang with no stdin). `-o` pins the output path.
  // Level.sav JSON can run to hundreds of MB; the payload goes to a file, but
  // give stdout/stderr generous headroom so a chatty run never overflows.
  await run(
    env.PYTHON_BIN,
    ['-m', CONVERT_MODULE, inputPath, direction, '-o', outputPath, '--force'],
    { cwd: env.SAVE_TOOLS_DIR, maxBuffer: 256 * 1024 * 1024 },
  )
  if (!existsSync(outputPath)) throw new Error(`Conversion produced no output for ${inputPath}`)
  return outputPath
}

/** Convert a `.sav` to `<path>.json` beside it; returns the json path. */
export function savToJson(savPath: string): Promise<string> {
  return convert(savPath, `${savPath}${JSON_SUFFIX}`, '--to-json')
}

/**
 * A unique temp JSON path beside a save file, e.g. `Level.sav.inv.<uuid>.json`.
 * Read paths MUST use a unique output per call — several requests decode the
 * same Level.sav concurrently, and a fixed name lets one request's cleanup
 * delete another's output mid-read ("Conversion produced no output").
 */
export function tempJsonPath(savPath: string, tag: string): string {
  return `${savPath}.${tag}.${randomUUID()}${JSON_SUFFIX}`
}

/** Convert a `<name>.sav.json` back to `<name>.sav`; returns the sav path. */
export function jsonToSav(jsonPath: string): Promise<string> {
  if (!jsonPath.endsWith(JSON_SUFFIX)) throw new Error('Expected a .json path')
  return convert(jsonPath, jsonPath.slice(0, -JSON_SUFFIX.length), '--from-json')
}

// Python's json module emits BARE `NaN` / `Infinity` / `-Infinity` for the
// non-finite floats some save fields hold (e.g. a rate that divides by zero).
// Those tokens are invalid JSON, so Node's JSON.parse rejects the whole file.
// Swap them for a sentinel string on the way in and restore the bare tokens on
// the way out — Python's json.loads accepts them, so the value round-trips
// unchanged through a re-encode without us ever having to interpret it.
const NON_FINITE: [token: string, quotedSentinel: string][] = [
  ['-Infinity', '"@@TSUKI_NEG_INF@@"'],
  ['Infinity', '"@@TSUKI_INF@@"'],
  ['NaN', '"@@TSUKI_NAN@@"'],
]

/** JSON.parse that tolerates the converter's bare NaN/Infinity tokens. */
export function parseSaveJson<T = unknown>(text: string): T {
  // -Infinity before Infinity so the shared "Infinity" tail isn't half-replaced.
  const safe = text
    .replace(/-Infinity/g, NON_FINITE[0][1])
    .replace(/\bInfinity\b/g, NON_FINITE[1][1])
    .replace(/\bNaN\b/g, NON_FINITE[2][1])
  return JSON.parse(safe) as T
}

/** JSON.stringify that restores bare NaN/Infinity tokens for Python to re-read. */
export function stringifySaveJson(value: unknown): string {
  let out = JSON.stringify(value)
  for (const [token, sentinel] of NON_FINITE) out = out.split(sentinel).join(token)
  return out
}

/**
 * Convert a save file to JSON, parse it, then delete the temp JSON. Read-only:
 * used to inspect save structure (e.g. to locate player positions) without ever
 * touching the original `.sav`.
 */
export async function readSaveJson<T = unknown>(savPath: string): Promise<T> {
  // Unique output so concurrent reads of the same save never clobber each other.
  const jsonPath = tempJsonPath(savPath, 'read')
  await convert(savPath, jsonPath, '--to-json')
  try {
    return parseSaveJson<T>(await readFile(jsonPath, 'utf8'))
  } finally {
    if (existsSync(jsonPath)) rmSync(jsonPath)
  }
}
