# Troubleshooting

Common issues and their fixes. Most are game-image behaviours with a one-line answer.

## Compose won't start

**Symptom:** `docker compose up` exits complaining about `AUTH_PASSWORD` / `JWT_SECRET`.

This is intentional — the stack refuses to run with the insecure defaults. Set both in `.env`:

```bash
AUTH_PASSWORD=your-strong-password
JWT_SECRET=$(openssl rand -hex 32)
```

## Can't stay logged in

**Symptom:** you log in but get bounced back to the login page.

Almost always `COOKIE_SECURE=true` while serving over plain `http://`. A `Secure` cookie is only sent over HTTPS, so the browser drops it. Set `COOKIE_SECURE=false` until you have [HTTPS](/installation/https) in front, then flip it back to `true`.

## The dashboard shows "connect your server"

No REST/RCON connection is configured or reachable. See [Connect your Palworld server](/installation/connect-server). If the game is in Docker with an unpublished REST port, use the [network overlay](/installation/connect-server#when-the-game-runs-in-docker-on-the-same-host).

## Config edits revert after restart {#config-edits-revert-after-restart}

**Symptom:** you save `PalWorldSettings.ini` from the panel, but it's back to defaults after a restart.

Your Palworld image **regenerates the ini from environment variables on boot**. On the **game server**, set:

```bash
DISABLE_GENERATE_SETTINGS=true
```

so the `.ini` is the source of truth. (Or set the value as the image's own env var, e.g. `EXP_RATE`.) This is an image behaviour, not a panel bug.

## Save editing isn't available

The **Save data** editors need three things — check each:

1. `PALWORLD_DATA_DIR` is set and the [overlay](/installation/data-mount) is mounting it (`/api/save/status` should report `available: true`).
2. `PALWORLD_CONTAINER` is set to the game container's name, and the Docker socket is mounted (`canWrite: true`).
3. You're signed in as an **admin**.

Do the read-only check first: open a player and load their location/stats. If reads work but writes don't, it's usually the container name or `DOCKER_GID`.

## "Conversion produced no output" (intermittent)

Fixed in current versions. It was a race between concurrent save reads sharing a temp file. Update to the latest and redeploy:

```bash
git pull origin main
docker compose -f compose.yml -f compose.palworld.yml up -d --build
```

## Batch apply fails with "not valid JSON" / `NaN`

Fixed in current versions. Some saves hold non-finite floats (`NaN`/`Infinity`) that older builds couldn't parse. Update and redeploy as above.

## Backups fail with a permissions error {#backups-fail-with-a-permissions-error}

The backups volume must be owned by the API's `node` user. The image handles this for a fresh volume. If you attached an old root-owned volume, recreate it (this destroys existing backups — export them first):

```bash
docker compose down
docker volume rm tsuki-panel_tsuki-backups
docker compose up -d --build
```

## Logs are empty {#logs-are-empty}

Your server may not write a log file (e.g. the thijsvanloef image logs only to stdout). Point the panel at the container's `docker logs` instead:

```bash
PALWORLD_CONTAINER=palworld-server
# and mount the socket (the overlay does this); set the docker group id:
DOCKER_GID=$(getent group docker | cut -d: -f3)
```

## Discord login is refused

- Make sure `DISCORD_GUILD_ID` **or** an id allowlist is set — with neither, login fails closed by design.
- Check `DISCORD_REDIRECT_URI` matches the Discord app registration **exactly** (watch for a stray double slash `//api`).
- Role-based access needs `DISCORD_GUILD_ID` plus `DISCORD_ADMIN_ROLE_IDS`.

## Scheduled restart/event fires at the wrong time

Times are in the **API container's** timezone. Set `TZ` (e.g. `TZ=Europe/Amsterdam`) on the api service and redeploy.

## Map positions look stale

Palworld doesn't expose live positions; the panel reads a periodic **save snapshot** (~1 minute). This is expected — it's not real-time movement.

## Still stuck?

Open an issue on [GitHub](https://github.com/starredev/palworld-dashboard/issues) with your compose files (redacted), `.env` keys (values redacted), and the API logs (`docker compose logs api`).
