# How the save editor works

The deep player/pal/guild/inventory editors read and write Palworld's **save files** directly. This page explains what happens under the hood — useful for trusting it, and for troubleshooting.

::: tip You don't need to read this to use it
The save editor is safe to use without understanding the internals. This is background for the curious and for debugging.
:::

## The pipeline

Every save write goes through one carefully-ordered cycle:

```
stop the game container
  → take an automatic "pre-edit" backup
    → decompress + decode the .sav to JSON
      → apply your queued edits
        → re-encode the JSON back to a .sav
  → start the game container
```

The container is **stopped** during the edit for a critical reason: a running Palworld server rewrites the save from memory on shutdown. If the game were up while we edited the file, it would clobber the change. Stopping it (a `docker stop`, which also marks it "manually stopped" so it stays down) guarantees the edit sticks; then the container is started again afterwards.

Because stopping/starting the container is required, save **writing** needs Docker container control — see [Live config, backups & save editing](/installation/data-mount).

## The save format (Oodle / `PlM`)

Palworld's 2026 "Tides of Terraria" update changed dedicated-server saves from zlib compression (magic bytes `PlZ`) to **Oodle** compression (magic bytes `PlM`). Most community save tools only understand the old `PlZ` format.

Tsuki Panel handles the new format:

- It bundles an open-source **Oodle (Kraken) decompressor** to read `PlM` saves — no proprietary game library required.
- On write-back it re-compresses as plain **zlib (`PlZ`)**. The game loads that fine, so we only ever need to *decompress* Oodle, never re-compress it.

The `.sav` ⇄ JSON conversion itself is done by a vendored, patched copy of [palworld-save-tools](https://github.com/cheahjs/palworld-save-tools), bundled into the API image. You don't install anything extra.

## Batch mode: one restart for everything

Restarting the server for each edit would be painful, so edits **queue into a batch** instead. You add as many edits as you like — teleport a player, give an item, edit a pal, rename a guild — and they show in a floating batch bar. When you hit **Apply all & restart**, they're all applied in the single stop → backup → edit → start cycle above.

- Edits to the small per-player files (teleport, tech points) and edits to the big `Level.sav` (everything else) are grouped efficiently.
- If one edit fails, the others still apply; the failure is reported, not fatal.
- The queue is persisted on disk, so it survives an API restart.

## Safety nets

- **Automatic backup before every apply** — restore it from the Backups page if anything looks wrong.
- **Container control failures are handled** — the container is always started again, even if an edit throws.
- **Validation up front** — e.g. removing/transferring an item checks you have enough *before* touching anything.

::: warning Always keep backups
Save editing is inherently risky. Tsuki Panel minimises the risk, but you should still test on a copy and keep your own backups of important worlds.
:::

Next: install it → **[Prerequisites](/installation/prerequisites)**.
