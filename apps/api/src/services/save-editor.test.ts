import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted so the vi.mock factories (also hoisted) can safely reference them.
const { files, execFileImpl } = vi.hoisted(() => {
  // In-memory filesystem: the set of paths that "exist".
  const files = new Set<string>()
  // Mock convert.py: derives the output path from the input's extension and
  // "creates" it, exactly as the real tool does, then invokes the callback so
  // promisify(execFile) resolves.
  const execFileImpl = vi.fn(
    (_cmd: string, args: string[], _opts: unknown, cb: (e: unknown, r: unknown) => void) => {
      const input = args[1]
      const out = input.endsWith('.json') ? input.slice(0, -5) : `${input}.json`
      files.add(out)
      cb(null, { stdout: '', stderr: '' })
    },
  )
  return { files, execFileImpl }
})

vi.mock('node:child_process', () => ({ execFile: execFileImpl }))
vi.mock('node:fs', () => ({
  existsSync: (p: string) => files.has(p),
  rmSync: (p: string) => void files.delete(p),
}))
vi.mock('node:fs/promises', () => ({ readFile: vi.fn(async () => '{"ok":true}') }))

const SAVE_DIR = '/palworld-data/Pal/Saved/SaveGames'
const CONVERT = join('/opt/palworld-save-tools', 'convert.py')

import { isSaveEditorAvailable, jsonToSav, readSaveJson, savToJson } from './save-editor'

beforeEach(() => {
  files.clear()
  files.add(CONVERT)
  files.add(SAVE_DIR)
  execFileImpl.mockClear()
})
afterEach(() => vi.clearAllMocks())

describe('isSaveEditorAvailable', () => {
  it('is true when the converter and save dir both exist', () => {
    expect(isSaveEditorAvailable()).toBe(true)
  })
  it('is false when the converter is missing', () => {
    files.delete(CONVERT)
    expect(isSaveEditorAvailable()).toBe(false)
  })
  it('is false when the save dir is not mounted', () => {
    files.delete(SAVE_DIR)
    expect(isSaveEditorAvailable()).toBe(false)
  })
})

describe('savToJson', () => {
  it('converts a .sav to <path>.json via python + convert.py', async () => {
    files.add(`${SAVE_DIR}/Level.sav`)
    const out = await savToJson(`${SAVE_DIR}/Level.sav`)
    expect(out).toBe(`${SAVE_DIR}/Level.sav.json`)
    expect(execFileImpl).toHaveBeenCalledWith(
      'python3',
      [CONVERT, `${SAVE_DIR}/Level.sav`],
      expect.any(Object),
      expect.any(Function),
    )
  })

  it('throws when the input .sav is missing', async () => {
    await expect(savToJson(`${SAVE_DIR}/Nope.sav`)).rejects.toThrow(/not found/i)
    expect(execFileImpl).not.toHaveBeenCalled()
  })
})

describe('jsonToSav', () => {
  it('converts a .sav.json back to .sav', async () => {
    files.add(`${SAVE_DIR}/Level.sav.json`)
    const out = await jsonToSav(`${SAVE_DIR}/Level.sav.json`)
    expect(out).toBe(`${SAVE_DIR}/Level.sav`)
  })

  it('rejects a path that is not .json', () => {
    expect(() => jsonToSav(`${SAVE_DIR}/Level.sav`)).toThrow(/\.json/i)
  })
})

describe('readSaveJson', () => {
  it('parses the converted JSON and cleans up the temp file', async () => {
    files.add(`${SAVE_DIR}/Level.sav`)
    const data = await readSaveJson(`${SAVE_DIR}/Level.sav`)
    expect(data).toEqual({ ok: true })
    // temp <path>.json removed afterwards
    expect(files.has(`${SAVE_DIR}/Level.sav.json`)).toBe(false)
  })
})
