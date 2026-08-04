import type { FastifyInstance } from 'fastify'
import { loadEnv } from '../config/env'
import { createAutoBackup, isBackupAvailable } from '../services/backups'

/** Periodically create save backups, pruning old ones (opt-in via env). */
export async function registerBackupScheduler(app: FastifyInstance): Promise<void> {
  const env = loadEnv()
  const hours = env.BACKUP_SCHEDULE_HOURS
  if (hours <= 0) return

  let timer: ReturnType<typeof setInterval> | null = null

  app.addHook('onReady', async () => {
    if (!isBackupAvailable()) {
      app.log.info('Scheduled backups requested but save data is not mounted.')
      return
    }
    app.log.info(`Scheduled backups every ${hours}h, keeping ${env.BACKUP_RETENTION}.`)
    timer = setInterval(
      () => {
        try {
          const entry = createAutoBackup(env.BACKUP_RETENTION)
          app.log.info(`Created scheduled backup ${entry.name}`)
        } catch (error) {
          app.log.error(error, 'scheduled backup failed')
        }
      },
      hours * 60 * 60 * 1000,
    )
  })

  app.addHook('onClose', async () => {
    if (timer) clearInterval(timer)
  })
}
