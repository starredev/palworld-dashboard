# Features overview

A tour of everything the panel does, and what each feature needs. Follow the links for details.

## Server & monitoring

| Feature | What it does | Needs |
| --- | --- | --- |
| [Overview](/features/monitoring#overview) | Status, version, uptime, players online | REST/RCON |
| [Insights](/features/monitoring#insights) | Metric history charts (players, memory) | REST/RCON |
| [Players](/features/monitoring#players) | Online list + offline roster; kick & ban | REST/RCON (offline roster uses GameData) |
| [Server controls](/features/monitoring#server-controls) | Broadcast, save, shutdown, unban | REST/RCON |
| [Logs & Activity](/features/monitoring#logs-activity) | Tail server logs; audit feed of panel actions | Log file or Docker socket |

## Configuration & operations

| Feature | What it does | Needs |
| --- | --- | --- |
| [Server config](/features/server-config) | Edit the real `PalWorldSettings.ini` and apply | Data mount (else client-side generator) |
| [Schedules & profiles](/features/schedules) | Scheduled restarts, weekly config events, saved profiles | Data mount |
| [Backups](/features/backups) | Snapshot, download, restore world saves | Data mount |

## World, pals & crafting

| Feature | What it does | Needs |
| --- | --- | --- |
| [Map](/features/world#map) | Coordinate map of players, bases, pals, bosses | GameData API |
| [Guilds](/features/world#guilds) | Guild list with members, bases, pal counts | GameData API or save |
| [Pals](/features/world#pals) | Every pal on the server, searchable | GameData/save |
| [Paldeck](/features/world#paldeck) | Browse all pals; track captured; rank workers | Bundled dataset |
| [Crafting planner](/features/crafting) | Recursive recipe breakdown + where to farm | Bundled dataset |

## Save editor (batched, auto-backups)

| Feature | What it does | Needs |
| --- | --- | --- |
| [Teleport](/features/save-editor#teleport) | Move a player anywhere (Xbox included) | Save mount + container control |
| [Player edits](/features/save-editor#players) | Level, exp, stat points, refuel, gold | Save mount + container control |
| [Pal edits](/features/save-editor#pals) | Level, IVs, stars, heal, passives, duplicate, copy | Save mount + container control |
| [Guild edits](/features/save-editor#guilds) | Rename, hand over leadership, kick | Save mount + container control |
| [Inventory](/features/save-editor#inventory) | View items; give, transfer, delete | Save mount + container control |

Every save edit is **queued and applied in one restart with an automatic backup** — see [Save editor](/features/save-editor).

## Authentication

A bootstrap **admin password** always works, plus optional **Discord OAuth** with role-based access (admin vs viewer). See [Authentication & roles](/reference/authentication).
