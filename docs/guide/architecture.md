# Architecture

Tsuki Panel is a **pnpm-workspaces monorepo**, typed end-to-end with TypeScript and Zod.

## Repository layout

```
apps/
  dashboard   Vue 3 + Vite + TS + Tailwind v4 + TanStack Query + Pinia   (browser)
  api         Fastify 5 + TS                                              (server)
packages/
  types       Shared types + Zod schemas (the source of truth)
  sdk         Server-side Palworld client (REST + RCON) — never bundled to the browser
  ui          Reusable shadcn-style Vue components
  shared      Framework-agnostic constants + utilities
docs/         This documentation site (VitePress)
```

## Data-flow boundary

The single most important rule in the codebase:

```
browser  →  apps/api  →  packages/sdk  →  Palworld
```

The **frontend never** touches RCON, the Palworld REST API, or server credentials directly. It only ever calls `apps/api`. All secrets and all Palworld communication live server-side in the API and the SDK. This keeps credentials off the client and lets the API mediate every action (auth, validation, audit logging).

## How a request flows

1. The **dashboard** (Vue) calls the API same-origin at `/api/...` via TanStack Query.
2. In dev, Vite proxies `/api` → `localhost:4000`. In production, **nginx** serves the SPA and reverse-proxies `/api` to the API container.
3. The **API** (Fastify) validates the request, checks auth (a JWT in an HTTP-only cookie), and calls into the **SDK** or a save-editing service.
4. The **SDK** talks to Palworld over REST (preferred) or RCON (fallback), or a service reads/writes the mounted save files.
5. Real-time data (status, metrics, players) is fanned out to all connected browsers over a single WebSocket.

## Single-origin deployment

In production everything sits behind **one** web server:

```
                    ┌──────────── tsuki-panel (docker compose) ────────────┐
  browser ──:80──▶  dashboard (nginx)  ──/api──▶  api (fastify, internal)   │
                    │  serves the SPA + proxies /api                        │
                    └──────────────────────────────────────────────────────┘
```

Only **one** port is exposed to the internet. There is no cross-origin CORS, and session cookies are same-origin. See **[Deploy with Docker](/installation/docker)**.

## Where things persist

The API writes its small state files (backup schedule, config profiles, the save-edit batch queue, the audit log, accumulated map sightings) to the **backups volume** so they survive redeploys. Backups themselves are zip snapshots of the world save. See the [environment variables](/reference/environment-variables) reference for the exact paths.

Next: **[How the save editor works](/guide/save-editor-internals)**.
