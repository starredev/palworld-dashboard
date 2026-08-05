import type { FastifyInstance } from 'fastify'
import { PalworldNotConfiguredError } from '@tsuki/sdk'
import type { RestartSchedule } from '@tsuki/types'
import { getSchedule } from '../services/restart-schedule'

const TICK_MS = 20_000
// How long after the target time we may still fire (catches brief downtime).
const FIRE_WINDOW_MS = 120_000

/**
 * Daily, ini-safe automatic restart. Force-stops the server (never a graceful
 * shutdown, which would rewrite PalWorldSettings.ini), so it reboots with the
 * current config. The schedule is read live each tick, so panel edits apply
 * without an API restart.
 */
export async function registerRestartScheduler(app: FastifyInstance): Promise<void> {
  let timer: ReturnType<typeof setInterval> | null = null
  let warnedFor: number | null = null
  let firedFor: number | null = null

  function todayTarget(schedule: RestartSchedule, now: Date): Date {
    const [h, m] = schedule.time.split(':').map(Number)
    const target = new Date(now)
    target.setHours(h, m, 0, 0)
    return target
  }

  async function warn(minutes: number): Promise<void> {
    try {
      await app.palworld.announce(
        `Server restarting in ${minutes} minute(s) for a scheduled reboot.`,
      )
    } catch (error) {
      if (!(error instanceof PalworldNotConfiguredError)) {
        app.log.warn({ err: error }, 'scheduled restart warning failed')
      }
    }
  }

  async function fire(schedule: RestartSchedule): Promise<void> {
    if (schedule.skipIfPlayersOnline) {
      try {
        const { players } = await app.palworld.getPlayers()
        if (players.length > 0) {
          app.log.info('Scheduled restart skipped — players online.')
          return
        }
      } catch {
        // Can't tell who's online — proceed rather than silently never restart.
      }
    }
    try {
      await app.palworld.announce('Scheduled server restart now.')
      await app.palworld.save()
    } catch (error) {
      app.log.warn({ err: error }, 'scheduled pre-restart save failed (continuing)')
    }
    try {
      await app.palworld.stop()
      app.log.info('Scheduled ini-safe force-restart issued.')
    } catch (error) {
      if (!(error instanceof PalworldNotConfiguredError)) {
        app.log.warn({ err: error }, 'scheduled stop errored (server likely restarting)')
      }
    }
  }

  async function tick(): Promise<void> {
    const schedule = getSchedule()
    if (!schedule.enabled) return

    const now = new Date()
    const key = todayTarget(schedule, now).getTime()
    const untilMs = key - now.getTime()

    // Warn once when we cross into the lead window before the target.
    if (
      schedule.warnMinutes > 0 &&
      untilMs > 0 &&
      untilMs <= schedule.warnMinutes * 60_000 &&
      warnedFor !== key
    ) {
      warnedFor = key
      await warn(Math.max(1, Math.round(untilMs / 60_000)))
      return
    }

    // Fire once shortly after the target passes.
    if (untilMs <= 0 && untilMs > -FIRE_WINDOW_MS && firedFor !== key) {
      firedFor = key
      await fire(schedule)
    }
  }

  app.addHook('onReady', async () => {
    app.log.info('Restart scheduler active (configure from the panel).')
    timer = setInterval(() => void tick(), TICK_MS)
  })

  app.addHook('onClose', async () => {
    if (timer) clearInterval(timer)
  })
}
