import type { FastifyInstance } from 'fastify'
import {
  configEventInputSchema,
  configProfileInputSchema,
  type ConfigProfilesState,
} from '@tsuki/types'
import { authenticate } from '../plugins/auth'
import { isConfigAvailable } from '../services/game-config'
import { applyIniAndRestart } from '../services/config-apply'
import {
  createEvent,
  deleteEvent,
  deleteProfile,
  eventStatus,
  getEvents,
  getProfile,
  getProfiles,
  upsertProfile,
} from '../services/config-profiles'

function state(): ConfigProfilesState {
  const now = new Date()
  return {
    profiles: getProfiles(),
    events: getEvents().map((e) => ({ ...e, status: eventStatus(e, now) })),
  }
}

/** Named config profiles and scheduled events (e.g. a "Double EXP weekend"). */
export async function configProfileRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/server/config/profiles',
    { preHandler: authenticate },
    async (): Promise<ConfigProfilesState> => state(),
  )

  app.post('/server/config/profiles', { preHandler: authenticate }, async (req, reply) => {
    const parsed = configProfileInputSchema.safeParse(req.body)
    if (!parsed.success)
      return reply.status(400).send({ message: 'A name and settings are required' })
    return upsertProfile(parsed.data)
  })

  app.delete('/server/config/profiles/:id', { preHandler: authenticate }, async (req) => {
    deleteProfile((req.params as { id: string }).id)
    return { ok: true }
  })

  app.post(
    '/server/config/profiles/:id/apply',
    { preHandler: authenticate },
    async (req, reply) => {
      const profile = getProfile((req.params as { id: string }).id)
      if (!profile) return reply.status(404).send({ message: 'Profile not found' })
      if (!isConfigAvailable()) {
        return reply.status(503).send({ message: 'PalWorldSettings.ini is not mounted' })
      }
      try {
        const { path, restarted } = await applyIniAndRestart(
          app,
          profile.body,
          profile.announce || undefined,
        )
        return { ok: true, path, restarted }
      } catch (error) {
        reply.log.error(error)
        return reply.status(500).send({ message: 'Failed to apply profile' })
      }
    },
  )

  app.post('/server/config/events', { preHandler: authenticate }, async (req, reply) => {
    const parsed = configEventInputSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid event' })
    if (new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt)) {
      return reply.status(400).send({ message: 'The end time must be after the start time' })
    }
    if (!getProfile(parsed.data.profileId) || !getProfile(parsed.data.revertProfileId)) {
      return reply.status(400).send({ message: 'Both profiles must exist' })
    }
    return createEvent(parsed.data)
  })

  app.delete('/server/config/events/:id', { preHandler: authenticate }, async (req) => {
    deleteEvent((req.params as { id: string }).id)
    return { ok: true }
  })
}
