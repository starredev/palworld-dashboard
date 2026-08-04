import { z } from 'zod'

export const backupEntrySchema = z.object({
  name: z.string(),
  size: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
})
export type BackupEntry = z.infer<typeof backupEntrySchema>

export const backupScheduleSchema = z.object({
  hours: z.number(),
  retention: z.number().int(),
})
export type BackupSchedule = z.infer<typeof backupScheduleSchema>

export const backupsResponseSchema = z.object({
  available: z.boolean(),
  backups: z.array(backupEntrySchema),
  schedule: backupScheduleSchema.nullable(),
})
export type BackupsResponse = z.infer<typeof backupsResponseSchema>
