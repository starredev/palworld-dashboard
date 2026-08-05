import type { FastifyInstance } from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  isSaveEditorAvailable: vi.fn(() => true),
  isContainerControlAvailable: vi.fn(() => true),
  savToJson: vi.fn(async (p: string) => `${p}.json`),
  jsonToSav: vi.fn(async () => '/x.sav'),
  createBackup: vi.fn(),
  startContainer: vi.fn(async () => {}),
  stopContainer: vi.fn(async () => {}),
  readFile: vi.fn(async () => '{"a":1}'),
  writeFile: vi.fn(async () => {}),
}))

vi.mock('./save-editor', () => ({
  isSaveEditorAvailable: h.isSaveEditorAvailable,
  savToJson: h.savToJson,
  jsonToSav: h.jsonToSav,
}))
vi.mock('./container-control', () => ({
  isContainerControlAvailable: h.isContainerControlAvailable,
  startContainer: h.startContainer,
  stopContainer: h.stopContainer,
}))
vi.mock('./backups', () => ({ createBackup: h.createBackup }))
vi.mock('node:fs', () => ({ existsSync: () => true, rmSync: vi.fn() }))
vi.mock('node:fs/promises', () => ({ readFile: h.readFile, writeFile: h.writeFile }))

import { editSaveFile } from './save-edit'

const app = { log: { info: vi.fn() } } as unknown as FastifyInstance

afterEach(() => vi.clearAllMocks())

describe('editSaveFile', () => {
  it('runs stop → backup → convert → mutate → convert-back → start', async () => {
    const mutate = vi.fn((json: Record<string, unknown>) => {
      json.edited = true
    })
    await editSaveFile(app, '/s/Level.sav', mutate)

    expect(h.stopContainer).toHaveBeenCalled()
    expect(h.createBackup).toHaveBeenCalledWith('pre-edit')
    expect(h.savToJson).toHaveBeenCalledWith('/s/Level.sav')
    expect(mutate).toHaveBeenCalled()
    expect(h.writeFile).toHaveBeenCalled()
    expect(h.jsonToSav).toHaveBeenCalledWith('/s/Level.sav.json')
    expect(h.startContainer).toHaveBeenCalled()

    // stop must happen before start
    expect(h.stopContainer.mock.invocationCallOrder[0]).toBeLessThan(
      h.startContainer.mock.invocationCallOrder[0],
    )
  })

  it('ALWAYS restarts the container even when the edit throws', async () => {
    const boom = () => {
      throw new Error('boom')
    }
    await expect(editSaveFile(app, '/s/Level.sav', boom)).rejects.toThrow('boom')
    expect(h.stopContainer).toHaveBeenCalled()
    expect(h.startContainer).toHaveBeenCalled()
  })

  it('refuses when the editor/container control is unavailable', async () => {
    h.isContainerControlAvailable.mockReturnValueOnce(false)
    await expect(editSaveFile(app, '/s/Level.sav', () => {})).rejects.toThrow(/container control/i)
    expect(h.stopContainer).not.toHaveBeenCalled()
  })
})
