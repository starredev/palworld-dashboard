# Server config editor

Edit your server's real `PalWorldSettings.ini` from the browser.

## Two modes

- **Client-side generator** (always available) — a data-driven editor for ~60 settings across 7 groups, with presets (Defaults, Casual, Community, Hardcore, Breeding). It produces a valid `.ini` you copy or download. Nothing is written to your server.
- **Live editing** (when the [data dir is mounted](/installation/data-mount)) — the page loads your **actual** `PalWorldSettings.ini`, and you can save it back and apply.

## The editor

- Settings are grouped and typed: numbers, toggles, enums, text, and platform tuples.
- Rate/multiplier fields render a **slider + number input** in sync, with sensible ranges.
- Parsing is **lossless**: unknown keys you've added by hand are preserved, and quoted values and platform tuples round-trip exactly.

## Saving to the server

When live editing is available you get two actions:

- **Save to server** — writes your changes back to `PalWorldSettings.ini`, keeping a `.bak` backup and preserving unknown keys.
- **Save & restart** — writes the file and restarts the server so the new settings take effect.

::: warning How "restart to apply" works
A running Palworld server rewrites `PalWorldSettings.ini` from memory on a *graceful* shutdown, which would revert your edit. So the panel applies config with a **force-stop**, then your container's `restart: unless-stopped` policy brings the server back up reading the new file. No Docker socket is needed for this particular flow — just the data mount.
:::

## Important: the settings must survive a restart

Some Palworld server images **regenerate** `PalWorldSettings.ini` from environment variables on every boot. If yours does (e.g. `thijsvanloef/palworld-server-docker` with `DISABLE_GENERATE_SETTINGS` unset), your panel edits get overwritten when the container restarts.

**Fix:** on the **game server**, set `DISABLE_GENERATE_SETTINGS=true` so the `.ini` is the source of truth. Then panel edits persist. (Alternatively, set the value as the image's own env var, e.g. `EXP_RATE`.)

The Config page shows a hint about this on the live-actions bar. See [Troubleshooting](/reference/troubleshooting#config-edits-revert-after-restart).

## Related

- Schedule config changes to happen automatically → **[Schedules & profiles](/features/schedules)**.
- Save named config snapshots to switch between → **[Config profiles](/features/schedules#config-profiles)**.
