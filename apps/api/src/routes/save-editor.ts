import type { FastifyInstance } from 'fastify'
import type { SaveEditorStatus } from '@tsuki/types'
import { authenticate } from '../plugins/auth'
import { loadEnv } from '../config/env'
import { isSaveEditorAvailable } from '../services/save-editor'

/** Save-file editor status — whether the converter + save dir are present. */
export async function saveEditorRoutes(app: FastifyInstance): Promise<void> {
  app.get('/save/status', { preHandler: authenticate }, async (): Promise<SaveEditorStatus> => {
    return { available: isSaveEditorAvailable(), saveDir: loadEnv().PALWORLD_SAVE_DIR }
  })
}
