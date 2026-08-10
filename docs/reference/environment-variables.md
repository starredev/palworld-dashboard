# Environment variables

Every setting Tsuki Panel reads, grouped by area. All live in the root `.env` (copied from `.env.example`). Optional variables can be left unset — the related feature simply stays hidden or falls back.

::: tip Empty means unset
Docker Compose injects empty strings for blank variables; the API treats `""` as absent, so leaving a value blank cleanly disables that feature.
:::

## API & CORS

| Variable | Default | Notes |
| --- | --- | --- |
| `API_HOST` | `0.0.0.0` | API bind address |
| `API_PORT` | `4000` | API port (internal in Docker) |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed origins (dev only; prod is same-origin) |
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |
| `TZ` | `UTC` | Timezone for scheduled restarts/events (e.g. `Europe/Amsterdam`) |

## Authentication

| Variable | Default | Notes |
| --- | --- | --- |
| `AUTH_PASSWORD` | `admin` | **Required in prod.** Bootstrap admin password |
| `JWT_SECRET` | insecure dev default | **Required in prod.** Session-signing secret, min 16 chars |
| `COOKIE_NAME` | `tsuki_session` | Session cookie name |
| `SESSION_TTL` | `7d` | Session lifetime |
| `COOKIE_SECURE` | on in prod | Force the `Secure` cookie flag; set `true` on HTTPS, `false` on plain http |

### Discord OAuth (optional)

| Variable | Notes |
| --- | --- |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | From your Discord app |
| `DISCORD_REDIRECT_URI` | Absolute callback URL, must match the Discord app exactly |
| `DISCORD_GUILD_ID` | Your Discord server id (required for role-based access) |
| `DISCORD_ADMIN_ROLE_IDS` | Role ids that get **admin** (comma-separated) |
| `DISCORD_ALLOWED_ROLE_IDS` | If set, only these roles may sign in (else any member = viewer) |
| `DISCORD_ADMIN_IDS` | User ids that get admin (extra/fallback) |
| `DISCORD_ALLOWED_IDS` | User id allowlist (extra/fallback) |

See [Authentication & roles](/reference/authentication).

## Palworld connection

| Variable | Default | Notes |
| --- | --- | --- |
| `PALWORLD_REST_URL` | — | e.g. `http://<game-ip>:8212`; needs `RESTAPIEnabled=True` |
| `PALWORLD_REST_USERNAME` | `admin` | REST username |
| `PALWORLD_REST_PASSWORD` | — | The server's `AdminPassword` |
| `PALWORLD_RCON_HOST` | — | RCON host; needs `RCONEnabled=True` |
| `PALWORLD_RCON_PORT` | `25575` | RCON port |
| `PALWORLD_RCON_PASSWORD` | — | The server's `AdminPassword` |
| `PALWORLD_NETWORK` | — | *(compose)* external Docker network of the game container, for the overlay |

See [Connect your Palworld server](/installation/connect-server).

## Data mount, config, backups & save editor

| Variable | Default | Notes |
| --- | --- | --- |
| `PALWORLD_DATA_DIR` | — | *(compose)* host path of the game data dir to mount |
| `PALWORLD_INI_PATH` | `/palworld-data/Pal/Saved/Config/LinuxServer/PalWorldSettings.ini` | Live ini path inside the API |
| `PALWORLD_SAVE_DIR` | `/palworld-data/Pal/Saved/SaveGames` | Save games dir inside the API |
| `BACKUP_DIR` | `/backups` | Where backup zips are stored |
| `BACKUP_SCHEDULE_HOURS` | `0` | Auto-backup every N hours (0 = off) |
| `BACKUP_RETENTION` | `7` | Auto-backups to keep |
| `PYTHON_BIN` | `python3` | Interpreter for the save converter (bundled) |
| `SAVE_TOOLS_DIR` | `/opt/palworld-save-tools` | Vendored converter dir (bundled) |
| `PALWORLD_CONTAINER` | — | Game container name — needed for save writing & docker-logs |
| `DOCKER_SOCKET` | `/var/run/docker.sock` | Docker socket path inside the API |
| `DOCKER_GID` | — | *(compose)* host `docker` group id so the non-root API can use the socket |

See [Live config, backups & save editing](/installation/data-mount).

## Logs

| Variable | Default | Notes |
| --- | --- | --- |
| `PALWORLD_LOG_PATH` | `/palworld-data/Pal/Saved/Logs/Pal.log` | Log file to tail (if your server writes one) |
| `PALWORLD_CONTAINER` | — | If the server only logs to stdout, read its `docker logs` instead |

## Map, guilds & pals (GameData)

| Variable | Default | Notes |
| --- | --- | --- |
| `GAMEDATA_URL` | — | Your palworld-live-map GameData API base URL |
| `GAMEDATA_STATE_PATH` | `/api/state` | State endpoint path |
| `GAMEDATA_OBJECTS_PATH` | `/api/objects` | Objects endpoint path |
| `LIVEMAP_URL` | falls back to `:3001` | Public URL of your live-map, linked from the Map page |
| `MAP_IMAGE_URL` | — | Full Palpagos map image for the built-in map background |
| `MAP_BOUNDS` | `349400,724400,-1099400,-724400` | World bounds of that image |
| `HEADER_IMAGE_URL` | — | Banner image across the top bar |

See [Guilds, Pals & live map](/installation/gamedata).

## Deployment (compose)

| Variable | Default | Notes |
| --- | --- | --- |
| `HTTP_PORT` | `80` | Public port nginx listens on |
| `COMPOSE_FILE` | — | Set to `compose.yml:compose.palworld.yml` to avoid `-f` flags |
| `VITE_API_URL` | `/api` | Only set if the API lives on a separate host |
| `VITE_LIVEMAP_URL` | — | Build-arg override for the embedded live-map URL |

## Persisted state paths

These default to the writable **backups volume** so they survive redeploys. You rarely change them.

| Variable | Default |
| --- | --- |
| `RESTART_SCHEDULE_PATH` | `/backups/tsuki-restart-schedule.json` |
| `CONFIG_PROFILES_PATH` | `/backups/tsuki-config-profiles.json` |
| `SAVE_BATCH_PATH` | `/backups/tsuki-save-batch.json` |
| `AUDIT_LOG_PATH` | `/backups/tsuki-audit.json` |
| `SIGHTINGS_PATH` | `/backups/tsuki-sightings.json` |
