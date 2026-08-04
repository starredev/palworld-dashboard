import type { FastifyInstance } from 'fastify'
import websocket from '@fastify/websocket'
import { RealtimeBroadcaster } from '../services/realtime'

/** Register WebSocket support and the shared broadcaster (started on ready). */
export async function registerRealtime(app: FastifyInstance): Promise<void> {
  await app.register(websocket)

  const broadcaster = new RealtimeBroadcaster(app.palworld, app.log)
  app.decorate('realtime', broadcaster)

  // Only poll when a server is configured; otherwise there's nothing to push.
  app.addHook('onReady', async () => {
    if (app.palworld.configured) broadcaster.start()
    else app.log.info('Realtime disabled: no Palworld server configured.')
  })
  app.addHook('onClose', async () => broadcaster.stop())
}
