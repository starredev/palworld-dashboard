/**
 * Connection configuration for a Palworld server.
 *
 * This package is **server-side only** — it holds RCON/REST credentials and
 * must never be imported into the browser bundle. The dashboard talks to
 * `apps/api`, which is the only consumer of this SDK.
 */
export interface PalworldClientOptions {
  rest: {
    baseUrl: string
    username: string
    password: string
  }
  rcon: {
    host: string
    port: number
    password: string
  }
}
