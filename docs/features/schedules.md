# Schedules & profiles

Automate operational changes: restarts, timed config events, and saved config snapshots. These live on the **Schedules** and **Config** pages and need the [data mount](/installation/data-mount).

## Restart scheduler

Plan automatic, save-safe server restarts.

- Set a **time** (`HH:MM`) and options: **warn players** N minutes before, and **skip if players are online**.
- The scheduler warns once in the lead window, then force-restarts within a short catch window.
- It reads its schedule live, so panel edits apply without restarting the API.

::: info Why a force-restart
Like the config editor, restarts use a **force-stop** so the game doesn't rewrite the save/ini from memory on the way down. Your container's restart policy brings it back up. The game image's own `AUTO_REBOOT` uses a graceful shutdown, which is why the panel ships its own.
:::

::: tip Timezone
Scheduled times are in the **API container's** local timezone. Set `TZ` (e.g. `TZ=Europe/Amsterdam`) on the api service if it's running in UTC.
:::

## Config events

Schedule a config change to switch on and off automatically — for example a **Double EXP weekend** that also announces itself.

- An event applies a **config profile** at its start and reverts to another profile at its end.
- **One-off** — pick a start and end datetime.
- **Weekly / recurring** — pick a start day + time and end day + time (e.g. *Fri 18:00 → Mon 06:00*), and it repeats every week.
- Each transition announces in-game and applies via the safe force-restart.

Events show a status badge: **upcoming**, **active**, or **done**.

## Config profiles

A **profile** is a full snapshot of your config (the `OptionSettings` body) plus an optional announcement message.

- Save your current editor state as a named profile (e.g. "Normal", "Double EXP").
- **Apply** a profile any time (with a confirm), or wire it into a config event.
- Reverting is just applying another profile — so a weekend event flips "Double EXP" on Friday and "Normal" back on Monday.

Create profiles on the **Config** page; schedule them on the **Schedules** page.
