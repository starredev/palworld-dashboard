import type { ZodType } from 'zod'

// Same-origin by default: the dashboard's web server proxies `/api` to the API.
// In dev, Vite proxies `/api` (see vite.config.ts); in prod, nginx does.
const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Typed fetch against `apps/api`. When a Zod `schema` is supplied the response
 * is validated, guaranteeing the caller receives the declared shape.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { schema?: ZodType<T> } = {},
): Promise<T> {
  const { schema, ...init } = options
  const headers = new Headers(init.headers)
  // Only advertise a JSON body when one is actually present — Fastify rejects
  // an empty body sent with `Content-Type: application/json`.
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers,
  })

  if (!res.ok) {
    throw new ApiError(res.status, `Request to ${path} failed with ${res.status}`)
  }

  if (res.status === 204 || res.headers.get('Content-Length') === '0') {
    return undefined as T
  }

  const data = (await res.json()) as unknown
  return schema ? schema.parse(data) : (data as T)
}
