import { execFile } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
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

/** Convert a `<name>.sav.json` back to `<name>.sav`; returns the sav path. */
export function jsonToSav(jsonPath: string): Promise<string> {
  if (!jsonPath.endsWith(JSON_SUFFIX)) throw new Error('Expected a .json path')
  return convert(jsonPath, jsonPath.slice(0, -JSON_SUFFIX.length), '--from-json')
}

/**
 * Convert a save file to JSON, parse it, then delete the temp JSON. Read-only:
 * used to inspect save structure (e.g. to locate player positions) without ever
 * touching the original `.sav`.
 */
export async function readSaveJson<T = unknown>(savPath: string): Promise<T> {
  const jsonPath = await savToJson(savPath)
  try {
    return JSON.parse(await readFile(jsonPath, 'utf8')) as T
  } finally {
    if (existsSync(jsonPath)) rmSync(jsonPath)
  }
}
