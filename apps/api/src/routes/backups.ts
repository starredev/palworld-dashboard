import { createReadStream, existsSync } from 'node:fs'
import type { FastifyInstance } from 'fastify'
import type { BackupsResponse } from '@tsuki/types'
import { authenticate, requireAdmin } from '../plugins/auth'
import { loadEnv } from '../config/env'
import {
  backupPath,
  createBackup,
  deleteBackup,
  isBackupAvailable,
  listBackups,
  restoreBackup,
} from '../services/backups'

export async function backupRoutes(app: FastifyInstance): Promise<void> {
  app.get('/backups', { preHandler: authenticate }, async (): Promise<BackupsResponse> => {
    const env = loadEnv()
    const schedule =
      env.BACKUP_SCHEDULE_HOURS > 0
        ? { hours: env.BACKUP_SCHEDULE_HOURS, retention: env.BACKUP_RETENTION }
        : null
    return { available: isBackupAvailable(), backups: listBackups(), schedule }
  })

  app.post('/backups', { preHandler: requireAdmin }, async (_req, reply) => {
    if (!isBackupAvailable()) return reply.status(503).send({ message: 'Save data is not mounted' })
    try {
      return createBackup()
    } catch (error) {
      reply.log.error(error)
      return reply.status(500).send({ message: 'Backup failed' })
    }
  })

  app.get<{ Params: { name: string } }>(
    '/backups/:name/download',
    { preHandler: authenticate },
    async (req, reply) => {
      let path: string
      try {
        path = backupPath(req.params.name)
      } catch {
        return reply.status(400).send({ message: 'Invalid backup name' })
      }
      if (!existsSync(path)) return reply.status(404).send({ message: 'Not found' })
      reply.header('Content-Type', 'application/zip')
      reply.header('Content-Disposition', `attachment; filename="${req.params.name}"`)
      return reply.send(createReadStream(path))
    },
  )

  app.post<{ Params: { name: string } }>(
    '/backups/:name/restore',
    { preHandler: requireAdmin },
    async (req, reply) => {
      if (!isBackupAvailable())
        return reply.status(503).send({ message: 'Save data is not mounted' })
      try {
        restoreBackup(req.params.name)
        return { ok: true }
      } catch (error) {
        reply.log.error(error)
        return reply.status(500).send({ message: 'Restore failed' })
      }
    },
  )

  app.delete<{ Params: { name: string } }>(
    '/backups/:name',
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        deleteBackup(req.params.name)
        return { ok: true }
      } catch {
        return reply.status(400).send({ message: 'Invalid backup name' })
      }
    },
  )
}
