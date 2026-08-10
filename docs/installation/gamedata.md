# Guilds, Pals & live map

Optional integrations that enrich the world pages. All are optional — the panel works without them.

## Guilds & Pals (GameData API)

Guilds and individual pals aren't part of Palworld's standard REST/RCON API — they live in the save. Tsuki Panel can read them from the **GameData API** exposed by [palworld-live-map](https://github.com/lukehollanddev/palworld-live-map), which many people already run.

Point the API at your live-map's internal URL in `.env`:

```bash
GAMEDATA_URL=http://palworld-live-map:8080
GAMEDATA_STATE_PATH=/api/state
GAMEDATA_OBJECTS_PATH=/api/objects
```

- Use the live-map **container name** if it's on the shared Docker network (via the overlay).
- The two paths default to `/api/state` and `/api/objects` and rarely need changing.

This powers the **Guilds** and **Pals** pages and the markers on the built-in map (players, bases, workers, wild pals, NPCs).

::: info Positions are save snapshots
Palworld doesn't expose live positions, so map coordinates refresh roughly once per save (~1 minute). It's a periodic snapshot, not smooth real-time movement.
:::

## The embedded live map link

The **Map** page can also link out to your full `palworld-live-map`. Set its public URL (served to the browser at runtime — no rebuild, just restart the API):

```bash
LIVEMAP_URL=https://your-live-map-domain/
```

If unset, the dashboard falls back to the same host on port `3001` (the live-map's usual port).

## A real map background image

The built-in coordinate map can render markers over the actual Palpagos map image instead of a blank grid:

```bash
MAP_IMAGE_URL=https://example.com/palworld-map.webp
# World-coordinate bounds of that image, "xTopLeft,yTopLeft,xBottomRight,yBottomRight".
# The default matches the standard palworld-live-map palpagos.jpg.
MAP_BOUNDS=349400,724400,-1099400,-724400
```

Use a north-up image covering the whole map. Tweak `MAP_BOUNDS` to calibrate marker alignment if needed.

## Brand banner

Show your own banner across the top bar:

```bash
# Any image URL, or a file you drop in apps/dashboard/public
# (e.g. apps/dashboard/public/brand/header.jpg → set the value to /brand/header.jpg)
HEADER_IMAGE_URL=/brand/header.jpg
```
