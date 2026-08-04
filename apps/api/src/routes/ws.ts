import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import { authenticate } from '../plugins/auth'

/** Authed WebSocket endpoint. Clients receive status/metrics/players pushes. */
export async function wsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/ws', { websocket: true, preValidation: authenticate }, (socket: WebSocket) => {
    app.realtime.add(socket)
    socket.on('close', () => app.realtime.remove(socket))
    socket.on('error', () => app.realtime.remove(socket))
  })
}
