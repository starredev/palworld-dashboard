import { z } from 'zod'
import { palSourceSchema } from './palworld'

export const broadcastInputSchema = z.object({
  message: z.string().min(1).max(500),
})
export type BroadcastInput = z.infer<typeof broadcastInputSchema>

export const shutdownInputSchema = z.object({
  seconds: z.coerce.number().int().min(1).max(3600).default(30),
  message: z.string().max(500).default('The server is shutting down'),
})
export type ShutdownInput = z.infer<typeof shutdownInputSchema>

/** Every admin command reports which transport (REST/RCON) carried it out. */
export const commandResultSchema = z.object({
  source: palSourceSchema,
})
export type CommandResult = z.infer<typeof commandResultSchema>
