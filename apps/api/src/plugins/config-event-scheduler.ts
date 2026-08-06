import type { FastifyInstance } from 'fastify'
import { applyIniAndRestart } from '../services/config-apply'
import { isConfigAvailable } from '../services/game-config'
import { getEvents, getProfile, inWeeklyWindow, markEvent } from '../services/config-profiles'
import { recordAudit } from '../services/audit'

const TICK_MS = 20_000

/**
 * Runs scheduled config events: at an event's start, apply its profile; at its
 * end, apply the revert profile. Both transitions announce + force-restart.
 * Progress is persisted (activated/reverted), so an API restart won't re-fire.
 */
export async function registerConfigEventScheduler(app: FastifyInstance): Promise<void> {
  let timer: ReturnType<typeof setInterval> | null = null

  async function applyProfile(profileId: string, fallbackPrefix: string): Promise<void> {
    const profile = getProfile(profileId)
    if (!profile) {
      app.log.warn(`Config event references a missing profile (${profileId}) — skipped.`)
      return
    }
    if (!isConfigAvailable()) {
      app.log.warn('Config event fired but PalWorldSettings.ini is not mounted — skipped.')
      return
    }
    const message = profile.announce || `${fallbackPrefix}: ${profile.name}`
    try {
      await applyIniAndRestart(app, profile.body, message)
      app.log.info(`Config event applied profile "${profile.name}".`)
      recordAudit({
        actorId: 'system',
        actorName: 'Scheduler',
        action: 'event.fire',
        summary: `${fallbackPrefix}: ${profile.name}`,
      })
    } catch (error) {
      app.log.error({ err: error }, 'config event apply failed')
    }
  }

  async function tick(): Promise<void> {
    const now = new Date()
    for (const event of getEvents()) {
      // Mark before applying so a slow apply can't double-fire on the next tick.
      if (event.recurrence === 'weekly') {
        if (event.startDay == null || !event.startTime || event.endDay == null || !event.endTime)
          continue
        const inside = inWeeklyWindow(
          now,
          event.startDay,
          event.startTime,
          event.endDay,
          event.endTime,
        )
        if (inside && !event.active) {
          markEvent(event.id, { active: true })
          await applyProfile(event.profileId, 'Event started')
        } else if (!inside && event.active) {
          markEvent(event.id, { active: false })
          await applyProfile(event.revertProfileId, 'Event ended')
        }
        continue
      }

      // One-off event with fixed start/end datetimes.
      const t = now.getTime()
      const start = event.startsAt ? new Date(event.startsAt).getTime() : Infinity
      const end = event.endsAt ? new Date(event.endsAt).getTime() : Infinity
      if (!event.activated && t >= start && t < end) {
        markEvent(event.id, { activated: true })
        await applyProfile(event.profileId, 'Event started')
      } else if (event.activated && !event.reverted && t >= end) {
        markEvent(event.id, { reverted: true })
        await applyProfile(event.revertProfileId, 'Event ended')
      }
    }
  }

  app.addHook('onReady', async () => {
    timer = setInterval(() => void tick(), TICK_MS)
  })

  app.addHook('onClose', async () => {
    if (timer) clearInterval(timer)
  })
}
