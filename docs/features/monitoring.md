# Monitoring & players

Everything for watching and moderating a live server. These features need a [REST/RCON connection](/installation/connect-server).

## Overview

The landing page shows your server at a glance:

- **Status** — online/offline, server name and version, uptime.
- **Players online** — current count vs capacity.
- **Server controls** — broadcast, save, shutdown (see below).
- **Recent activity** — a feed of join/leave events.

Data streams over a **WebSocket**: a single server-side poller fans status, metrics and players out to every connected browser, so the page updates with no interaction. The top bar shows a **Live** badge while it's connected.

## Insights

Metric **history charts** — players online and server memory over time — rendered as lightweight SVG line/area charts with hover. The API keeps a rolling in-memory buffer of samples, so you get a trend without any external time-series database.

## Players

Two tables:

- **Online** — name, level and ping, with one-click **Kick** and **Ban** (Ban confirms first).
- **Offline roster** — everyone who has played, with level, guild, captures, Paldeck progress and **last seen**. This comes from the [GameData API](/installation/gamedata).

Click a player's name for a **detail dialog**: level, ping, player id / user id (copyable), location with a map link, and moderation actions. For admins with the save mounted, the dialog also shows a **Save data** section — see the [Save editor](/features/save-editor).

## Server controls

From the Overview (admins only):

- **Broadcast** a message to everyone in-game.
- **Save** the world.
- **Shutdown** (with a confirmation).
- **Unban** by Steam id.

Kick and Ban live on the player rows. All of these run over REST (or RCON), not by editing files.

## Logs & Activity

- **Server logs** — a live tail of your Palworld server log, styled like a terminal (line numbers, dimmed timestamps, level colours, pause and filter). It reads a log **file** if your server writes one, or the game container's **`docker logs`** if it only logs to stdout (like the thijsvanloef image). See [Troubleshooting](/reference/troubleshooting#logs-are-empty) to pick the right source.
- **Activity** — an audit feed of every successful action taken *through the panel* (who did what, when). Schedulers log as `system`. Great for a shared, multi-admin server.

::: info Kick & ban and Xbox players
RCON's kick/ban target the player's platform id. For teleporting Xbox/Game Pass players specifically, use the save editor's [teleport](/features/save-editor#teleport) — the live teleport command is Steam-only.
:::
