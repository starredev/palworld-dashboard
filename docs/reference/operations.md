# Managing the deployment

Day-to-day commands for running the panel with Docker Compose.

Run these from the panel's directory (where `compose.yml` lives).

## Everyday commands

```bash
docker compose logs -f          # tail logs (all services)
docker compose logs -f api      # tail just the API
docker compose ps               # status + health
docker compose up -d --build    # (re)build and start / redeploy
docker compose down             # stop everything
docker compose restart api      # restart just the API (e.g. after a .env change)
```

If you use the Palworld network overlay, include both files (or set `COMPOSE_FILE`):

```bash
docker compose -f compose.yml -f compose.palworld.yml up -d --build
```

## Updating to a new version

```bash
git pull origin main
docker compose up -d --build         # add the -f overlay if you use it
```

Rebuilds are incremental — the heavy save-converter/Oodle build layers are cached, so most updates rebuild quickly.

## After changing `.env`

Most variables are read at start, so apply changes with:

```bash
docker compose up -d          # recreates containers with the new env
```

For API-only variables you can `docker compose restart api`. Note that the **scheduler times** and **live config** are read continuously, so those don't need a restart.

## Health checks

- API health endpoint: `GET /api/health` (or `/health` in local dev).
- The dashboard top bar shows a **Live** badge when the WebSocket is connected and a connection status for the game server.

## Backups & state

- World backups and the panel's small state files live in the `tsuki-backups` volume. Don't delete it unless you mean to.
- To move to a new host, copy that volume (or export backups from the Backups page) along with your `.env`.

## Recreating volumes

If you ever need to recreate the backups volume (e.g. after changing ownership), remember it holds your backups and state:

```bash
docker compose down
docker volume rm tsuki-panel_tsuki-backups   # destroys backups — export first!
docker compose up -d --build
```

See [Troubleshooting](/reference/troubleshooting) for specific error fixes.
