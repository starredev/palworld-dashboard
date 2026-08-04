import 'dotenv/config'
import { buildApp } from './app'
import { loadEnv } from './config/env'

async function main(): Promise<void> {
  const env = loadEnv()
  const app = await buildApp()

  try {
    await app.listen({ host: env.API_HOST, port: env.API_PORT })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      app.log.info(`Received ${signal}, shutting down`)
      void app.close().then(() => process.exit(0))
    })
  }
}

void main()
