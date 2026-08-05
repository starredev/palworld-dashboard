import type { FastifyInstance } from 'fastify'
import { PalworldNotConfiguredError } from '@tsuki/sdk'
import { isConfigAvailable, writeConfigFile } from './game-config'

export interface ApplyResult {
  path: string
  restarted: boolean
}

/**
 * The one safe way to apply an ini change: (optional) announce → save → write
 * the file → *force*-stop. A graceful shutdown would rewrite the ini from
 * memory and revert the change, so it is deliberately never used here. Shared
 * by the manual apply route, profile apply, and the scheduled event runner.
 */
export async function applyIniAndRestart(
  app: FastifyInstance,
  body: string,
  announce?: string,
): Promise<ApplyResult> {
  if (!isConfigAvailable()) {
    throw new Error('PalWorldSettings.ini is not mounted')
  }

  // Best-effort: warn players and persist the world before cutting it down.
  try {
    if (announce) await app.palworld.announce(announce)
    await app.palworld.save()
  } catch (error) {
    app.log.warn({ err: error }, 'pre-restart announce/save failed (continuing)')
  }

  const path = writeConfigFile(body)

  // Force-stop last, after the file is on disk. NOT a graceful shutdown.
  try {
    await app.palworld.stop()
  } catch (error) {
    if (error instanceof PalworldNotConfiguredError) return { path, restarted: false }
    app.log.warn({ err: error }, 'force-stop errored (server likely restarting)')
  }
  return { path, restarted: true }
}
