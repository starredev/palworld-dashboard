export interface RestClientOptions {
  baseUrl: string
  username: string
  password: string
  timeoutMs?: number
}

export class RestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'RestError'
  }
}

/** Minimal JSON-over-HTTP client with Basic auth and a request timeout. */
export class RestClient {
  private readonly auth: string
  private readonly timeoutMs: number

  constructor(private readonly options: RestClientOptions) {
    this.auth = 'Basic ' + Buffer.from(`${options.username}:${options.password}`).toString('base64')
    this.timeoutMs = options.timeoutMs ?? 5000
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(`${this.options.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: this.auth,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new RestError(res.status, `${method} ${path} failed with ${res.status}`)
      }

      const text = await res.text()
      return (text ? JSON.parse(text) : undefined) as T
    } finally {
      clearTimeout(timer)
    }
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }
}
