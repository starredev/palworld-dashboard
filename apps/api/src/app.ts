import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { APP_NAME } from '@tsuki/shared'
import { loadEnv } from './config/env'
import { registerAuth } from './plugins/auth'
import { registerPalworld } from './plugins/palworld'
import { registerRealtime } from './plugins/realtime'
import { healthRoutes } from './routes/health'
import { configRoutes } from './routes/config'
import { authRoutes } from './routes/auth'
import { serverRoutes } from './routes/server'
import { playerRoutes } from './routes/players'
import { commandRoutes } from './routes/commands'
import { gameConfigRoutes } from './routes/game-config'
import { backupRoutes } from './routes/backups'
import { gameDataRoutes } from './routes/gamedata'
import { historyRoutes } from './routes/history'
import { logRoutes } from './routes/logs'
import { wsRoutes } from './routes/ws'

/** Build a fully-configured Fastify instance (without starting to listen). */
export async function buildApp(): Promise<FastifyInstance> {
  const env = loadEnv()

  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  })

  if (env.NODE_ENV === 'production' && env.JWT_SECRET.startsWith('dev-insecure')) {
    app.log.warn('JWT_SECRET is using the insecure default — set a strong secret in production.')
  }

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
  await registerAuth(app)
  await registerPalworld(app)
  await registerRealtime(app)

  // All HTTP endpoints live under /api so a single reverse proxy can serve the
  // dashboard and forward /api to this service (same-origin, no browser CORS).
  await app.register(healthRoutes, { prefix: '/api' })
  await app.register(configRoutes, { prefix: '/api' })
  await app.register(authRoutes, { prefix: '/api' })
  await app.register(serverRoutes, { prefix: '/api' })
  await app.register(playerRoutes, { prefix: '/api' })
  await app.register(commandRoutes, { prefix: '/api' })
  await app.register(gameConfigRoutes, { prefix: '/api' })
  await app.register(backupRoutes, { prefix: '/api' })
  await app.register(gameDataRoutes, { prefix: '/api' })
  await app.register(historyRoutes, { prefix: '/api' })
  await app.register(logRoutes, { prefix: '/api' })
  await app.register(wsRoutes, { prefix: '/api' })

  app.get('/', async () => ({ name: APP_NAME, docs: '/api/health' }))

  return app
}
