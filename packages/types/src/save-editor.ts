import { z } from 'zod'

/**
 * Whether the save-file editor is usable. Gated on the palworld-save-tools
 * converter being vendored in the api image AND the save dir being mounted.
 */
export const saveEditorStatusSchema = z.object({
  available: z.boolean(),
  saveDir: z.string(),
})
export type SaveEditorStatus = z.infer<typeof saveEditorStatusSchema>
