# Deploy with Docker

The recommended way to run Tsuki Panel on a server. One command builds and starts everything.

## How the stack runs

The whole panel sits behind a single web server: **nginx serves the dashboard and reverse-proxies `/api`** to the API container. Only one port is exposed to the internet, there's no cross-origin CORS, and session cookies are same-origin.

```
                    ┌──────────── tsuki-panel (docker compose) ────────────┐
  browser ──:80──▶  dashboard (nginx)  ──/api──▶  api (fastify, internal)   │
                    │  serves the SPA + proxies /api                        │
                    └──────────────────────────────────────────────────────┘
```

## Install

On your server (with Docker + the Compose plugin installed):

```bash
git clone https://github.com/starredev/palworld-dashboard.git tsuki-panel
cd tsuki-panel
cp .env.example .env
# Edit .env — you MUST set AUTH_PASSWORD and a strong JWT_SECRET.
docker compose up -d --build
```

Then open `http://<your-server-ip>/` and sign in.

::: warning Compose refuses to start without secrets
`docker compose` **will not start** if `AUTH_PASSWORD` or `JWT_SECRET` is unset. That's intentional — it stops you from ever shipping the insecure defaults. Set a real password and a long random `JWT_SECRET` (min 16 chars).
:::

## The minimum `.env`

| Variable | Required | Notes |
| --- | --- | --- |
| `AUTH_PASSWORD` | ✅ | Panel admin password |
| `JWT_SECRET` | ✅ | Session-signing secret, **min 16 chars** — use a long random value |
| `HTTP_PORT` | — | Public port nginx listens on (default `80`) |
| `COOKIE_SECURE` | — | Set to `true` once you serve over HTTPS |
| `SESSION_TTL` | — | Session lifetime (default `7d`) |

Generate a strong secret:

```bash
openssl rand -hex 32
```

If port 80 is taken, set e.g. `HTTP_PORT=8080` and open `http://<your-server-ip>:8080/`.

## Next steps

A bare install runs the panel, but shows a "connect your server" state until you wire it up:

1. **[Connect your Palworld server](/installation/connect-server)** — REST/RCON for live data.
2. **[Live config, backups & save editing](/installation/data-mount)** — mount the game data to unlock the config editor, backups and the save editor.
3. **[Guilds, Pals & live map](/installation/gamedata)** — optional integrations.
4. **[HTTPS](/installation/https)** — front it with TLS for production.

## Redeploying after an update

```bash
git pull origin main
docker compose up -d --build
```

If you use the Palworld network overlay (see [data mount](/installation/data-mount)), include it every time:

```bash
git pull origin main
docker compose -f compose.yml -f compose.palworld.yml up -d --build
```

::: tip Avoid repeating the -f flags
Set `COMPOSE_FILE=compose.yml:compose.palworld.yml` in your `.env`, then plain `docker compose up -d --build` picks up both files.
:::

See **[Managing the deployment](/reference/operations)** for logs, status and more.

## Hosting this documentation

This docs site can run as its own container next to the panel, via the `compose.docs.yml` overlay:

```bash
docker compose -f compose.yml -f compose.docs.yml up -d --build
```

It publishes on `DOCS_PORT` (default `8081`). Point a subdomain at it with your reverse proxy — for example an nginx server block:

```nginx
server {
    server_name docs.example.com;
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    # add TLS (certbot / your proxy of choice)
}
```

Caddy is even shorter:

```text
docs.example.com {
    reverse_proxy localhost:8081
}
```

Combine all overlays you use in one command (or set `COMPOSE_FILE` in `.env`):

```bash
docker compose -f compose.yml -f compose.palworld.yml -f compose.docs.yml up -d --build
```
