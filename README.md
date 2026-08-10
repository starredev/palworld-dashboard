# Tsuki Panel

**The all-in-one control panel for your Palworld server.** Monitor it, configure it, and deep-edit the save — all from one fast, self-hosted dashboard.

![License: MIT](https://img.shields.io/badge/license-MIT-8b5cf6)
![Vue 3](https://img.shields.io/badge/Vue-3-42b883)
![Fastify](https://img.shields.io/badge/Fastify-5-000000)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Docker](https://img.shields.io/badge/deploy-Docker-2496ed)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

A modern, open-source management platform for Palworld servers — with a UX inspired by Vercel, Linear, Railway and Grafana. Dark-mode, responsive, and built as a typed monorepo.

Run your whole server from one panel: watch live players and metrics, browse the Paldeck and crafting tree, see where pals roam on the map — and, when the save is mounted, deep-edit players, pals, guilds and inventories through a safe, batched save editor.

### Why Tsuki Panel?

- **One panel, whole server** — players, guilds, pals, config, backups and the map, instead of a pile of tools and RCON commands.
- **A real save editor, done safely** — every edit is queued, previewed, and applied in one restart with an automatic backup. No raw hex, no guesswork.
- **Self-hosted & private** — your data stays on your box. One port, no cross-origin, same-origin cookies.
- **Built to last** — typed end-to-end (TypeScript + Zod), tested, and Dockerized for a one-command deploy.

## Features

Everything below is live in the panel. Save-editing features need the game save mounted (see [Save editing](#save-editing-optional)); the rest just need a REST/RCON connection.

### 🖥️ Server & monitoring

- **Overview** — server status, version, uptime, and players online at a glance.
- **Insights** — metric history charts (players online, memory) over time.
- **Live players** — who's online, level and ping, with one-click **kick** and **ban**; plus an offline roster with last-seen.
- **Logs** — tail raw server logs, and a separate **Activity** feed of panel actions.
- **Live map** — a coordinate map of players, bases, pals, wild spawns, NPCs and bosses, with toggleable layers.
  - **Roam zones** — search any pal species and see the areas where it roams, accumulated from live sightings over time.

### ⚙️ Configuration & operations

- **Server config** — edit the real `PalWorldSettings.ini` from the browser: load the live file, save it back (with a `.bak` and preserved unknown keys), and restart to apply.
- **Scheduled events** — schedule config changes like a **Double EXP weekend**, one-off or **recurring/weekly**.
- **Restart scheduler** — plan automatic server restarts.
- **Backups** — snapshot, download and restore world saves; a restore takes a safety backup first.

### 🐾 Pals & crafting

- **Paldeck** — browse every pal with art, elements and stats; track which the server has captured.
  - **Work-skill ranking** — pick a work skill (Handiwork = crafting, or any of the 12) and rank pals by level to find your best workers.
- **Crafting planner** — pick a recipe and see the full raw-material breakdown, **including where to get each material** (which pals drop it, and where on the map).

### 🛠️ Save editor (batched, with auto-backups)

Queue any number of edits, then apply them all with **one server restart** — and every apply takes an automatic pre-edit backup first.

- **Players** — teleport (works for Xbox players too), set level, edit stat points (HP/stamina/attack/weight/…), refuel, and **add gold**.
- **Inventory** — view a player's items (with icons) and **give items** from a searchable, dataset-backed picker.
- **Pals** — edit level and IVs/talents, **fully heal**, **duplicate** a pal, and add/remove **passive skills** — including the movement-speed passives (Swift/Runner/Nimble) that speed up flying mounts.
- **Guilds** — a dedicated guild page to **rename** a guild, **hand over leadership**, and **kick members** (personal/solo guilds are supported too).
- **Toasts everywhere** — every queued edit and apply gives clear in-app feedback.

> The save editor reads and writes the current Oodle-compressed Palworld save format. Edits are queued and previewed before anything is written, and each apply is backed up automatically — but always test on a copy first.

## Screenshots

_Coming soon._ Add captures to `docs/screenshots/` and uncomment the grid below.

<!-- Screenshot grid — drop the four PNGs into docs/screenshots/ and remove these comment markers.
|                   Overview                    |                  Live map                  |
| :-------------------------------------------: | :----------------------------------------: |
|  ![Overview](docs/screenshots/overview.png)   |   ![Live map](docs/screenshots/map.png)    |
|               **Player editor**               |               **Paldeck**                  |
| ![Player editor](docs/screenshots/player.png) | ![Paldeck](docs/screenshots/paldeck.png)   |
-->

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

## Documentation

Full documentation lives in [`docs/`](docs/) as a VitePress site — installation, per-feature guides, an environment-variable reference, and troubleshooting.

```bash
pnpm --filter @tsuki/docs docs:dev     # live preview
pnpm --filter @tsuki/docs docs:build   # build static site → docs/.vitepress/dist
```

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

| Variable                                    | Notes                                                      |
| ------------------------------------------- | ---------------------------------------------------------- |
| `PALWORLD_REST_URL`                         | e.g. `http://<game-ip>:8212` — needs `RESTAPIEnabled=True` |
| `PALWORLD_REST_PASSWORD`                    | the server's `AdminPassword`                               |
| `PALWORLD_RCON_HOST` / `PALWORLD_RCON_PORT` | needs `RCONEnabled=True`                                   |
| `PALWORLD_RCON_PASSWORD`                    | the server's `AdminPassword`                               |

### Live map

The **Map** page embeds [palworld-live-map](https://github.com/lukehollanddev/palworld-live-map)
if you run it. By default it points at the same host on port `3001` (its usual
published port). Override with the `VITE_LIVEMAP_URL` build arg / env if it lives
elsewhere. If the live-map blocks embedding, the page's "Open in new tab" link
still works.

### Live config editing (optional)

The **Config** page can edit your server's real `PalWorldSettings.ini`. Mount the
game server's data dir into the API (via the overlay) and set the host path:

```bash
# in .env
PALWORLD_DATA_DIR=/path/to/your/palworld   # the dir the game container mounts
```

Then the Config page auto-loads the live file, **Save to server** writes it back
(with a `.bak` backup, preserving unknown keys), and **Restart** shuts the server
down so your container's `restart: unless-stopped` policy brings it back with the
new settings — no Docker socket access required. Without `PALWORLD_DATA_DIR` the
page stays a safe client-side generator (copy/download).

### Backups

With `PALWORLD_DATA_DIR` mounted (see above), the **Backups** page can snapshot,
download and restore your world saves. Backups are stored in a `tsuki-backups`
volume; a restore takes a `pre-restore` safety backup first and needs a server
restart to take effect.

### Save editing (optional)

The deep player/pal/guild/inventory editors read and write the game **save
files** directly. This needs the save dir mounted and Docker container control
(to stop/start the game while a write happens). The API image bundles the save
converter, so no extra setup is required beyond the mounts:

| Variable            | Notes                                                               |
| ------------------- | ------------------------------------------------------------------- |
| `PALWORLD_SAVE_DIR` | Path to `…/Pal/Saved/SaveGames` inside the API container (mount it) |

Every edit is **queued into a batch** and applied in a single stop → **backup** →
edit → start cycle, so one restart covers all your changes and a fresh pre-edit
backup always exists. Without the mount, these pages simply stay hidden.

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
