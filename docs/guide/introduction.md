# Introduction

**Tsuki Panel** is an open-source, self-hosted management platform for [Palworld](https://www.pocketpair.jp/palworld) dedicated servers. It gives you one fast dashboard to run your whole server — instead of a pile of tools, RCON commands and manual save edits.

The UX is inspired by Vercel, Linear, Railway and Grafana: dark-mode, responsive, and built as a typed monorepo.

## What you can do

- **Watch your server live** — status, version, uptime, players online, and metric history charts.
- **Manage players** — see who's online (level, ping), an offline roster with last-seen, and kick/ban with one click.
- **Edit the real config** — load, edit and save your server's `PalWorldSettings.ini` from the browser, then restart to apply.
- **Automate operations** — scheduled restarts, weekly config events (a "Double EXP weekend"), and automatic backups.
- **Explore the world** — a coordinate map of players, bases, pals, wild spawns, NPCs and bosses; a full Paldeck; and a crafting planner that tells you which pals drop each material and where.
- **Deep-edit the save** — teleport players (Xbox included), edit player stats, pals, guilds and inventories, through a safe, batched save editor that backs up before every apply.

## Two tiers of features

Tsuki Panel works with **any** Palworld dedicated server over its REST or RCON API. Some features additionally need access to the game's **save files** and container:

| Tier | Needs | Unlocks |
| --- | --- | --- |
| **Connected** | A REST and/or RCON connection | Overview, players, server commands, logs, insights, live config editing¹ |
| **Save-mounted** | The game's data dir mounted + Docker control | The save editor: teleport, player/pal/guild/inventory edits, backups, guilds & pals from the save |

¹ Live `PalWorldSettings.ini` editing needs the data dir mounted; without it, the Config page is a safe client-side generator (copy/download).

If a tier isn't available, the panel simply hides those pages or shows a friendly "connect your server" state — nothing breaks.

## Is it safe?

The save editor is the powerful part, so it's built defensively:

- **Every edit is queued**, previewed in a batch, and applied in a single stop → **backup** → edit → start cycle.
- **Every apply takes an automatic pre-edit backup** first, and you can restore any backup from the Backups page.
- The game container is stopped while a write happens, so the server never rewrites the save from memory mid-edit.

Still — as with any save tool — **test on a copy first**, and keep backups.

## License

Tsuki Panel is released under the **MIT License**. Contributions are welcome — see the [GitHub repository](https://github.com/starredev/palworld-dashboard).

Next: **[Architecture](/guide/architecture)** — how the pieces fit together.
