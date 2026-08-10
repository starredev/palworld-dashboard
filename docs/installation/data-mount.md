# Live config, backups & save editing

These three features all need access to the game server's **data directory**. Save editing additionally needs **Docker container control**. This page sets both up.

## 1. Mount the game data

Point the panel at the directory your **game container mounts** (the one holding `Pal/Saved/...`). Set the host path in `.env`:

```bash
PALWORLD_DATA_DIR=/path/to/your/palworld
```

The bundled `compose.palworld.yml` overlay mounts that host dir into the API container at `/palworld-data`. Bring the stack up with the overlay:

```bash
docker compose -f compose.yml -f compose.palworld.yml up -d --build
```

::: tip Find the right path
If your game runs in Docker, inspect it to see what it mounts:
`docker inspect <game-container>` → look at `Mounts` for the source of its `/palworld` (or similar) bind. That host path is your `PALWORLD_DATA_DIR`.
:::

With the data mounted you immediately unlock:

- **Live config editing** — the Config page loads the real `PalWorldSettings.ini`.
- **Backups** — snapshot, download and restore world saves.

## 2. What each feature needs

| Feature | Needs |
| --- | --- |
| Live `PalWorldSettings.ini` editing | Data dir mounted (`PALWORLD_INI_PATH` resolves inside it) |
| Backups | Data dir mounted (`PALWORLD_SAVE_DIR`) |
| **Save editor** (players/pals/guilds/inventory) | Data dir mounted **+ Docker container control** |

Without the mount, these pages simply stay hidden — nothing errors.

## 3. Docker container control (for save writing)

Save **writing** stops the game container while it edits the save (see [How the save editor works](/guide/save-editor-internals)), so the API needs to control the container. Set the game container name and expose the Docker socket.

In `.env`:

```bash
PALWORLD_CONTAINER=palworld-server   # your game container's name
# The non-root API needs the host's docker group id to use the socket.
# Find it with:  getent group docker
DOCKER_GID=999
```

The `compose.palworld.yml` overlay mounts the Docker socket for this. `DOCKER_GID` must match your host's `docker` group so the non-root API user can read/write the socket.

::: warning The socket is powerful
Mounting the Docker socket grants the API control over containers. That's required to stop/start the game safely around a save write. Only run the panel on a host you trust, behind authentication.
:::

## 4. Verify

- **Config page** should load your live settings (not the client-side generator).
- **Backups page** should let you create a snapshot.
- A player's **detail dialog** (admins) should show a **Save data** section with stats, pals and inventory, plus edit actions.

If a save read ever fails intermittently or the config didn't persist, check **[Troubleshooting](/reference/troubleshooting)** — most gotchas are game-image behaviours with a one-line fix.

## The reference paths

These default to the standard Palworld layout inside the mounted `/palworld-data`. Override only if your layout differs — see [environment variables](/reference/environment-variables):

- `PALWORLD_INI_PATH` — `…/Config/LinuxServer/PalWorldSettings.ini`
- `PALWORLD_SAVE_DIR` — `…/Pal/Saved/SaveGames`
- `PALWORLD_LOG_PATH` — `…/Pal/Saved/Logs/Pal.log`
