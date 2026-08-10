# Prerequisites

What you need before installing Tsuki Panel.

## A Palworld dedicated server

Tsuki Panel manages an **existing** Palworld dedicated server — it doesn't run the game itself. You should already have one running (bare-metal, or in Docker such as the popular [thijsvanloef/palworld-server-docker](https://github.com/thijsvanloef/palworld-server-docker) image).

To show live data, enable **at least one** of these on the game server (in `PalWorldSettings.ini`):

- **REST API** (recommended): `RESTAPIEnabled=True`, plus an `AdminPassword`. Default port `8212`.
- **RCON**: `RCONEnabled=True`, plus an `AdminPassword`. Default port `25575`.

See [Connect your Palworld server](/installation/connect-server) for details.

## To deploy the panel (recommended path)

- **Docker** and the **Docker Compose plugin**.
- A machine to run it on (a small VPS is plenty).
- Optionally, a domain and reverse proxy if you want HTTPS.

That's it — the Docker image bundles everything else (Node, nginx, the save-file converter and its Oodle decompressor).

## To run it locally from source (development)

- **Node.js ≥ 20.19**
- **pnpm 10** (`npm install -g pnpm@10`)

## For save editing (optional)

The deep save editor needs two extra things at deploy time — both covered in [Live config, backups & save editing](/installation/data-mount):

1. The game server's **data directory mounted** into the panel.
2. **Docker container control** (a mounted Docker socket) so the panel can stop/start the game while it writes.

The game server must be running in **Docker** on the same host for this, because the panel stops/starts its container by name.

## Choose your path

- Just trying it out on your machine → **[Local development](/installation/local-development)**
- Installing on a server → **[Deploy with Docker](/installation/docker)**
