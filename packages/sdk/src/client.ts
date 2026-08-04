import type { ServerSummary } from '@tsuki/types'
import type { PalworldClientOptions } from './types'

/**
 * Typed client for a Palworld server. The frontend never uses this directly;
 * `apps/api` wraps it behind HTTP/WS endpoints.
 *
 * Namespaces (players, guilds, metrics, chat, rcon, ...) will be filled in
 * during Phase 2. For now it exposes just enough for the health/overview flow.
 */
export class PalworldClient {
  constructor(private readonly options: PalworldClientOptions) {}

  /** Human-readable identity of the configured server (host:port of REST API). */
  get target(): string {
    return this.options.rest.baseUrl
  }

  /**
   * Fetch a summary snapshot of the server.
   *
   * TODO(phase-2): implement against the Palworld REST API. Returns a stubbed
   * offline snapshot until then so the API and dashboard can be wired end-to-end.
   */
  async getSummary(): Promise<ServerSummary> {
    return {
      name: 'Palworld Server',
      state: 'unknown',
      version: null,
      players: { online: 0, max: 32 },
    }
  }
}

export function createPalworldClient(options: PalworldClientOptions): PalworldClient {
  return new PalworldClient(options)
}
