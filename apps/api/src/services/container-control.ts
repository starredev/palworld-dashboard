import http from 'node:http'
import { existsSync } from 'node:fs'
import { loadEnv } from '../config/env'

/** Control needs the container name set and the Docker socket mounted (RW). */
export function isContainerControlAvailable(): boolean {
  const env = loadEnv()
  return Boolean(env.PALWORLD_CONTAINER) && existsSync(env.DOCKER_SOCKET)
}

interface DockerResponse {
  status: number
  body: Buffer
}

function dockerRequest(method: string, path: string, timeoutMs = 15000): Promise<DockerResponse> {
  const env = loadEnv()
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath: env.DOCKER_SOCKET, path, method, timeout: timeoutMs },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks) }))
      },
    )
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('Docker API timeout')))
    req.end()
  })
}

function containerName(): string {
  const name = loadEnv().PALWORLD_CONTAINER
  if (!name) throw new Error('PALWORLD_CONTAINER is not set')
  return encodeURIComponent(name)
}

/** Docker returns 304 for a no-op (already started/stopped) — treat as success. */
export function okOrThrow(status: number, action: string): void {
  if (status >= 400 && status !== 304) throw new Error(`Docker ${action} responded ${status}`)
}

/** Read `.State.Running` out of a `/containers/{id}/json` inspect body. */
export function parseRunning(body: Buffer): boolean {
  const state = JSON.parse(body.toString('utf8')) as { State?: { Running?: boolean } }
  return Boolean(state.State?.Running)
}

/** True when the game container is currently running. */
export async function isContainerRunning(): Promise<boolean> {
  const res = await dockerRequest('GET', `/containers/${containerName()}/json`)
  okOrThrow(res.status, 'inspect')
  return parseRunning(res.body)
}

/**
 * Gracefully stop the container (SIGTERM, then SIGKILL after `t`s). The Docker
 * stop endpoint blocks until the container has exited, so no separate wait is
 * needed. A graceful stop lets Palworld flush the world to disk first, giving a
 * consistent save to edit; and Docker marks the container manually-stopped, so a
 * restart policy will NOT bring it back until we explicitly start it again.
 */
export async function stopContainer(t = 30): Promise<void> {
  const res = await dockerRequest(
    'POST',
    `/containers/${containerName()}/stop?t=${t}`,
    (t + 15) * 1000,
  )
  okOrThrow(res.status, 'stop')
}

/** Start the container again after an edit. */
export async function startContainer(): Promise<void> {
  const res = await dockerRequest('POST', `/containers/${containerName()}/start`)
  okOrThrow(res.status, 'start')
}
