import type { RestClientOptions } from './rest/http'
import type { RconConnectionOptions } from './rcon/connection'

/**
 * Connection configuration for a Palworld server. Both transports are optional
 * and independent — a server may expose REST, RCON, or both.
 *
 * This package is **server-side only** — it holds RCON/REST credentials and
 * must never be imported into the browser bundle. Only `apps/api` consumes it.
 */
export interface PalworldClientOptions {
  rest?: RestClientOptions
  rcon?: RconConnectionOptions
}

/** Thrown when an operation is requested but no transport is configured. */
export class PalworldNotConfiguredError extends Error {
  constructor() {
    super('No Palworld connection is configured (set REST and/or RCON credentials).')
    this.name = 'PalworldNotConfiguredError'
  }
}
