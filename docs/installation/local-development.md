# Local development

Run the dashboard and API from source to try it out or to contribute.

## Requirements

- **Node.js ≥ 20.19**
- **pnpm 10** — `npm install -g pnpm@10`

## Setup

```bash
git clone https://github.com/starredev/palworld-dashboard.git tsuki-panel
cd tsuki-panel
pnpm install
cp .env.example .env   # optional — sensible defaults work out of the box
pnpm dev
```

`pnpm dev` runs both apps together:

- **Dashboard** → [http://localhost:5173](http://localhost:5173)
- **API** → [http://localhost:4000](http://localhost:4000) (health check at `/health`)

The default login password is `admin` (change it with `AUTH_PASSWORD` in `.env`).

::: tip
The dashboard calls the API same-origin at `/api`; Vite proxies that to `localhost:4000` in dev, so you don't need to configure any URL.
:::

## Run one app at a time

```bash
pnpm dev:dashboard   # just the Vue app
pnpm dev:api         # just the Fastify API
```

## Useful scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run the dashboard and API together |
| `pnpm build` | Build every workspace package |
| `pnpm lint` | ESLint across the monorepo |
| `pnpm lint:fix` | ESLint with autofix |
| `pnpm format` | Prettier write |
| `pnpm typecheck` | Type-check every package |
| `pnpm test` | Run the Vitest suites |

## Connecting to a real server in dev

Point the API at your Palworld server by setting the connection variables in `.env` (see [Connect your Palworld server](/installation/connect-server)). Save editing and live config editing generally need the Docker deployment (they depend on mounted paths and container control), so those are best tested with the [Docker install](/installation/docker).

## Editing these docs

The docs site is its own workspace under `docs/`:

```bash
pnpm --filter @tsuki/docs docs:dev      # live preview at http://localhost:5173
pnpm --filter @tsuki/docs docs:build    # build the static site into docs/.vitepress/dist
```
