# FAQ

## Does Tsuki Panel run the Palworld server itself?

No. It **manages an existing** dedicated server over REST/RCON and (optionally) its save files. You keep running the game however you already do.

## Do I need REST *and* RCON?

No — either one is enough. The API prefers REST and falls back to RCON. REST is recommended (it's simpler and exposes more).

## Does it work without mounting the save?

Yes. Monitoring, players, server commands, logs, insights and the client-side config generator all work with just a connection. Mounting the save adds live config editing, backups, guilds/pals-from-save and the deep save editor.

## Is the save editor safe?

It's built to be: every edit is queued and previewed, applied in one restart, and preceded by an **automatic backup**. The game container is stopped during the write so nothing clobbers it. That said — always test on a copy and keep backups; save editing is inherently risky.

## Can I edit Xbox / Game Pass players?

Yes. Save editing is platform-independent, so teleport and player edits work for Xbox players — unlike the live teleport command, which is Steam-only.

## Which save format does it support?

The current **Oodle-compressed** format (magic `PlM`) introduced in the 2026 update, as well as older zlib saves. It bundles an open-source Oodle decompressor — no proprietary game files needed. See [How the save editor works](/guide/save-editor-internals).

## Why did my config change disappear after a restart?

Your server image likely regenerates the ini from env vars on boot. Set `DISABLE_GENERATE_SETTINGS=true` on the game server. See [Troubleshooting](/reference/troubleshooting#config-edits-revert-after-restart).

## Can multiple admins use it?

Yes. Use Discord OAuth for per-person logins with **admin** and **viewer** roles, and the **Activity** page records who did what. See [Authentication & roles](/reference/authentication).

## Does it need the Docker socket?

Only the **save editor's write path** does (to stop/start the game around a write). Monitoring, config editing and backups don't. The socket is mounted read-only for the logs feature and read-write for save writing.

## How do I update?

```bash
git pull origin main
docker compose up -d --build   # add the -f overlay if you use it
```

## Is it really free?

Yes — MIT licensed and open source. Contributions and issues welcome on [GitHub](https://github.com/starredev/palworld-dashboard).
