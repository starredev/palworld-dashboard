import http from 'node:http'
import { existsSync } from 'node:fs'
import { loadEnv } from '../config/env'

/** Available when a container name is set and the Docker socket is mounted. */
export function containerLogsAvailable(): boolean {
  const env = loadEnv()
  return Boolean(env.PALWORLD_CONTAINER) && existsSync(env.DOCKER_SOCKET)
}

function dockerGet(path: string): Promise<Buffer> {
  const env = loadEnv()
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath: env.DOCKER_SOCKET, path, method: 'GET', timeout: 5000 },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Docker API responded ${res.statusCode}`))
          } else {
            resolve(Buffer.concat(chunks))
          }
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('Docker API timeout')))
    req.end()
  })
}

/**
 * Docker's log stream for a non-TTY container is multiplexed with an 8-byte
 * header per frame ([stream, 0,0,0, size(BE32)]); TTY containers return raw
 * text. Detect and demux accordingly.
 */
export function demux(buf: Buffer): string {
  const frames: Buffer[] = []
  let i = 0
  while (i + 8 <= buf.length) {
    const type = buf[i]
    if (type > 2 || buf[i + 1] !== 0 || buf[i + 2] !== 0 || buf[i + 3] !== 0) {
      return buf.toString('utf8') // not framed — raw TTY output
    }
    const size = buf.readUInt32BE(i + 4)
    const start = i + 8
    const end = start + size
    if (end > buf.length) break
    frames.push(buf.subarray(start, end))
    i = end
  }
  return frames.length ? Buffer.concat(frames).toString('utf8') : buf.toString('utf8')
}

/** Read the last `maxLines` lines of the game container's `docker logs`. */
export async function readContainerLogs(maxLines: number): Promise<string[]> {
  const name = loadEnv().PALWORLD_CONTAINER
  if (!name) return []
  const buf = await dockerGet(
    `/containers/${encodeURIComponent(name)}/logs?stdout=1&stderr=1&tail=${maxLines}`,
  )
  return demux(buf)
    .split(/\r?\n/)
    .filter((l) => l.length > 0)
    .slice(-maxLines)
}
