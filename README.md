# Tsuki Panel

A modern, open-source management platform for Palworld servers — with a UX inspired by Vercel, Linear, Railway and Grafana. Dark-mode, responsive, and built as a typed monorepo.

> **Status:** early scaffold. This is the runnable base (Phase 1 in progress) — a dark dashboard shell talking to a Fastify API. Game-server features (players, guilds, pals, metrics, live map) arrive in later phases.

## Architecture

```
apps/
  dashboard   Vue 3 + Vite + TS + Tailwind v4 + TanStack Query   (browser)
  api         Fastify + TS                                        (server)
packages/
  types       Shared types + Zod schemas (source of truth)
  sdk         Server-side Palworld client (RCON/REST) — never bundled to the browser
  ui          Reusable shadcn-style Vue components
  shared      Framework-agnostic constants + utilities
```

**Data flow:** `browser → apps/api → packages/sdk → Palworld`. The frontend only ever
calls `apps/api`; it never touches RCON, the Palworld REST API, or server credentials directly.

## Getting started

Requires **Node ≥ 20.19** and **pnpm 10**.

```bash
pnpm install
cp .env.example .env   # optional — sensible defaults work out of the box
pnpm dev
```

- Dashboard → http://localhost:5173
- API → http://localhost:4000 (health at `/health`)

Default login password is `admin` (set `AUTH_PASSWORD` to change it).

## Deploy with Docker (VPS)

The stack runs behind a single web server: nginx serves the dashboard and
reverse-proxies `/api` to the API container. Only **one** port is exposed to the
internet, there is no cross-origin CORS, and session cookies are same-origin.

```
                         ┌────────────── tsuki-panel (docker compose) ──────────────┐
  browser ──:80──▶  dashboard (nginx)  ──/api──▶  api (fastify, internal :4000)      │
                         │  serves the SPA + proxies /api                            │
                         └──────────────────────────────────────────────────────────┘
```

On the VPS (Docker + Compose plugin installed):

```bash
git clone <your-repo-url> tsuki-panel && cd tsuki-panel
cp .env.example .env
# Edit .env — you MUST set AUTH_PASSWORD and a strong JWT_SECRET.
docker compose up -d --build
```

Open `http://<your-server-ip>/` and sign in.

### Required / useful env (root `.env`)

| Variable        | Required | Notes                                                          |
| --------------- | -------- | -------------------------------------------------------------- |
| `AUTH_PASSWORD` | ✅       | Panel admin password                                           |
| `JWT_SECRET`    | ✅       | Session-signing secret, min 16 chars — use a long random value |
| `HTTP_PORT`     | —        | Public port nginx listens on (default `80`)                    |
| `COOKIE_SECURE` | —        | Set to `true` once you serve over HTTPS                        |
| `SESSION_TTL`   | —        | Session lifetime (default `7d`)                                |

Compose **refuses to start** if `AUTH_PASSWORD` or `JWT_SECRET` is unset — that's
intentional, so you never ship the insecure defaults.

### Connect your Palworld server

Set the REST and/or RCON connection so the panel shows live metrics and players
(the API prefers REST and falls back to RCON). Both are optional — until one is
configured, the dashboard shows a friendly "connect your server" state.

| Variable | Notes |
| --- | --- |
| `PALWORLD_REST_URL` | e.g. `http://<game-ip>:8212` — needs `RESTAPIEnabled=True` |
| `PALWORLD_REST_PASSWORD` | the server's `AdminPassword` |
| `PALWORLD_RCON_HOST` / `PALWORLD_RCON_PORT` | needs `RCONEnabled=True` |
| `PALWORLD_RCON_PASSWORD` | the server's `AdminPassword` |

### HTTPS

Terminate TLS with a reverse proxy in front (Caddy, Traefik, or nginx + certbot)
pointing at `HTTP_PORT`, then set `COOKIE_SECURE=true` and restart. A bundled TLS
setup can come later; for now this keeps the image simple.

### Managing the deployment

```bash
docker compose logs -f          # tail logs
docker compose ps               # status + health
docker compose up -d --build    # redeploy after pulling changes
docker compose down             # stop
```

## Scripts

| Command          | Description                        |
| ---------------- | ---------------------------------- |
| `pnpm dev`       | Run the dashboard and API together |
| `pnpm build`     | Build every workspace package      |
| `pnpm lint`      | ESLint across the monorepo         |
| `pnpm format`    | Prettier write                     |
| `pnpm typecheck` | Type-check every package           |
| `pnpm test`      | Run Vitest suites                  |

## License

MIT
