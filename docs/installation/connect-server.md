# Connect your Palworld server

Wire the panel to your Palworld server so it shows live metrics and players, and can run server commands (broadcast, save, kick, ban, shutdown).

The API prefers **REST** and falls back to **RCON**. Both are optional — until one is configured, the dashboard shows a friendly "connect your server" state instead of live data.

## REST API (recommended)

On the **game server**, enable the REST API in `PalWorldSettings.ini`:

```ini
RESTAPIEnabled=True
AdminPassword="your-admin-password"
```

Then in the panel's `.env`:

```bash
PALWORLD_REST_URL=http://<game-ip>:8212
PALWORLD_REST_USERNAME=admin
PALWORLD_REST_PASSWORD=your-admin-password
```

`PALWORLD_REST_PASSWORD` is the server's `AdminPassword`. The default REST port is `8212`.

## RCON (alternative / fallback)

On the game server:

```ini
RCONEnabled=True
RCONPort=25575
AdminPassword="your-admin-password"
```

In the panel's `.env`:

```bash
PALWORLD_RCON_HOST=<game-ip>
PALWORLD_RCON_PORT=25575
PALWORLD_RCON_PASSWORD=your-admin-password
```

You can set both REST and RCON; the API uses REST when it can and RCON otherwise.

## When the game runs in Docker on the same host

If your Palworld server is another Docker container and its REST port (`8212`) is **not published** to the host, connect Tsuki to the game's Docker network with the bundled overlay file:

```bash
docker compose -f compose.yml -f compose.palworld.yml up -d --build
```

Then reach the game by its **container name** and set the network name in `.env`:

```bash
PALWORLD_REST_URL=http://palworld-server:8212
PALWORLD_NETWORK=palworld_default
```

- `palworld-server` is the game container's name (change to yours).
- `PALWORLD_NETWORK` is the external Docker network the game is on. Find it with `docker inspect <game-container>` (look at its networks) or `docker network ls`.

::: tip Restart the API to pick up connection changes
The connection variables are read at API start, so `docker compose up -d` (or restart the api service) after editing them.
:::

## Verify

Open the panel's **Overview** page. Once connected you'll see the server name, version, uptime and players online. The top bar also shows a **Live** badge when the WebSocket is streaming.
