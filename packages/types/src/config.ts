import { z } from 'zod'

/** Public, runtime app configuration served by the API to the browser. */
export const appConfigSchema = z.object({
  /** Absolute URL of the live-map to embed, or null to fall back to :3001. */
  liveMapUrl: z.string().nullable(),
})

export type AppConfig = z.infer<typeof appConfigSchema>
