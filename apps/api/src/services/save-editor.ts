import { execFile } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { loadEnv } from '../config/env'

const run = promisify(execFile)

// palworld-save-tools bundles a convert.py that picks direction by extension:
// a `.sav` becomes `<name>.sav.json`, and a `.sav.json` becomes `<name>.sav`.
const JSON_SUFFIX = '.json'

function toolScript(): string {
  return join(loadEnv().SAVE_TOOLS_DIR, 'convert.py')
}

/** Usable only when the converter is vendored AND the save dir is mounted. */
export function isSaveEditorAvailable(): boolean {
  const env = loadEnv()
  return existsSync(toolScript()) && existsSync(env.PALWORLD_SAVE_DIR)
}

/** Run convert.py on one path; the caller states the expected output path. */
async function convert(inputPath: string, outputPath: string): Promise<string> {
  if (!existsSync(inputPath)) throw new Error(`Save file not found: ${inputPath}`)
  // convert.py refuses to overwrite an existing target — clear any stale output.
  if (existsSync(outputPath)) rmSync(outputPath)
  const env = loadEnv()
  // Level.sav JSON can run to hundreds of MB; the payload is written to a file,
  // but give stdout/stderr generous headroom so a chatty run never overflows.
  await run(env.PYTHON_BIN, [toolScript(), inputPath], { maxBuffer: 256 * 1024 * 1024 })
  if (!existsSync(outputPath)) throw new Error(`Conversion produced no output for ${inputPath}`)
  return outputPath
}

/** Convert a `.sav` to `<path>.json` beside it; returns the json path. */
export function savToJson(savPath: string): Promise<string> {
  return convert(savPath, `${savPath}${JSON_SUFFIX}`)
}

/** Convert a `<name>.sav.json` back to `<name>.sav`; returns the sav path. */
export function jsonToSav(jsonPath: string): Promise<string> {
  if (!jsonPath.endsWith(JSON_SUFFIX)) throw new Error('Expected a .json path')
  return convert(jsonPath, jsonPath.slice(0, -JSON_SUFFIX.length))
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
