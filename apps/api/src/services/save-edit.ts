import { existsSync, rmSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import type { FastifyInstance } from 'fastify'
import { createBackup } from './backups'
import { isContainerControlAvailable, startContainer, stopContainer } from './container-control'
import { isSaveEditorAvailable, jsonToSav, savToJson } from './save-editor'

/** Mutates the parsed save JSON in place (or returns a promise that does). */
export type SaveMutator = (json: Record<string, unknown>) => void | Promise<void>

/** A save edit needs BOTH the converter and Docker container control wired up. */
export function isSaveEditAvailable(): boolean {
  return isSaveEditorAvailable() && isContainerControlAvailable()
}

/**
 * Safely edit one save file. The game MUST be down while we rewrite the file,
 * so this: stops the container (which flushes the world to disk and, being a
 * manual stop, keeps it down) → backs the saves up → converts .sav→JSON →
 * applies `mutate` → converts back → and ALWAYS starts the container again,
 * even if the edit itself throws.
 */
export async function editSaveFile(
  app: FastifyInstance,
  savPath: string,
  mutate: SaveMutator,
): Promise<void> {
  if (!isSaveEditAvailable()) {
    throw new Error('Save editing needs the converter and Docker container control')
  }

  app.log.info({ savPath }, 'save edit: stopping the game container')
  await stopContainer()
  try {
    createBackup('pre-edit')
    const jsonPath = await savToJson(savPath)
    try {
      const json = JSON.parse(await readFile(jsonPath, 'utf8')) as Record<string, unknown>
      await mutate(json)
      await writeFile(jsonPath, JSON.stringify(json))
      await jsonToSav(jsonPath)
    } finally {
      if (existsSync(jsonPath)) rmSync(jsonPath)
    }
  } finally {
    app.log.info('save edit: starting the game container')
    await startContainer()
  }
}
