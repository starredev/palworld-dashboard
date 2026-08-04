import type { FastifyInstance, FastifyReply } from 'fastify'
import { PalworldNotConfiguredError } from '@tsuki/sdk'
import { broadcastInputSchema, shutdownInputSchema, type CommandResult } from '@tsuki/types'
import { authenticate } from '../plugins/auth'

/** Run an admin command, mapping SDK errors to HTTP responses. */
export async function runCommand(
  reply: FastifyReply,
  fn: () => Promise<CommandResult>,
): Promise<CommandResult | undefined> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof PalworldNotConfiguredError) {
      await reply.status(503).send({ message: 'No Palworld server configured' })
    } else {
      reply.log.error(error)
      await reply.status(502).send({ message: 'Command failed' })
    }
    return undefined
  }
}

export async function commandRoutes(app: FastifyInstance): Promise<void> {
  app.post('/commands/broadcast', { preHandler: authenticate }, async (req, reply) => {
    const parsed = broadcastInputSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ message: 'A message is required' })
    return runCommand(reply, () => app.palworld.announce(parsed.data.message))
  })

  app.post('/commands/save', { preHandler: authenticate }, async (_req, reply) => {
    return runCommand(reply, () => app.palworld.save())
  })

  app.post('/commands/shutdown', { preHandler: authenticate }, async (req, reply) => {
    const { seconds, message } = shutdownInputSchema.parse(req.body ?? {})
    return runCommand(reply, () => app.palworld.shutdown(seconds, message))
  })
}
