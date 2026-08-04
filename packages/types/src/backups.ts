import { z } from 'zod'

export const backupEntrySchema = z.object({
  name: z.string(),
  size: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
})
export type BackupEntry = z.infer<typeof backupEntrySchema>

export const backupsResponseSchema = z.object({
  available: z.boolean(),
  backups: z.array(backupEntrySchema),
})
export type BackupsResponse = z.infer<typeof backupsResponseSchema>
