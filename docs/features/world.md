# Map, Guilds, Pals & Paldeck

The world pages. The map/guilds/pals read from the [GameData API](/installation/gamedata); the Paldeck ships with a bundled dataset.

## Map

A built-in coordinate map (its own pan/zoom SVG — not an iframe) plotting:

- **Players**, **bases**, **workers** (pals), **NPCs** and **wild pals**, as colour-coded markers with tooltips.
- **Bosses** and **field alphas** from a bundled landmark catalogue, as toggleable layers.

Controls: toggle layers, pan (drag), zoom (wheel / +/− / reset). With `MAP_IMAGE_URL` set, markers project onto the real Palpagos map image.

### Find where a species roams

Pick a species in **Find species** to filter the wild layer to just that pal, with a live match count. It also draws translucent **area circles** over the clusters where they currently are. The [Paldeck](#paldeck) and [crafting planner](/features/crafting) link straight here (`/map?species=<id>`).

::: info Snapshot, not habitat
This shows **currently-spawned** wild pals from the latest save snapshot, plus zones accumulated from sightings over time — not static, official habitat data.
:::

## Guilds

A guild list grouped from the save/GameData: each guild's members, base count and pal count. See the [Save editor](/features/save-editor#guilds) for renaming a guild, handing over leadership, or kicking members.

## Pals

Every pal on the server in one searchable, sortable table — species, level, gender and owner. Handy for finding a specific pal or auditing what's on the server.

## Paldeck

Browse **every** pal with art, elements, rarity and stats — powered by a bundled dataset (no server connection required).

- **Owned vs missing** — pals the server has captured are highlighted; missing ones are dimmed. Filter server-wide or per player.
- **Click a pal** for a detail dialog: stats, work suitability, description, and who owns it on your server.
- **Work-skill ranking** — pick a work skill (Handiwork = crafting, or any of the 12) and rank pals by level to find your best workers.
- **Show on map** — jump to where a species roams right now.

Pal artwork is hotlinked from palworld.gg; if an icon can't load, a coloured initial stands in.
