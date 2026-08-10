# Backups

Snapshot, download and restore your world saves. Needs the [data dir mounted](/installation/data-mount).

## Manual backups

From the **Backups** page:

- **Create** a snapshot — a zip of the current world save, stored in a `tsuki-backups` volume.
- **Download** any backup to your machine.
- **Restore** a backup — this takes a **`pre-restore` safety backup first**, then restores. A restore needs a server restart to take effect.
- **Delete** old backups.

All backup operations are path-traversal-safe and scoped to the backups volume.

## Scheduled backups

Automate periodic snapshots with two environment variables:

```bash
BACKUP_SCHEDULE_HOURS=6   # take an auto-backup every 6 hours (0 = disabled)
BACKUP_RETENTION=7        # keep the newest 7 auto-backups, prune older ones
```

Auto-backups are prefixed `auto-` and pruned to the retention count. The Backups page shows the active schedule.

## How backups tie into the save editor

The save editor reuses this same backup system: **every "Apply all & restart" takes an automatic `pre-edit` backup** before writing. So if an edit ever goes wrong, you can restore the snapshot from just before it. See the [Save editor](/features/save-editor).

::: tip Volume permissions
The backups volume is created and owned correctly by the API image. If you ever recreate volumes or hit a permissions error writing a backup, see [Troubleshooting](/reference/troubleshooting#backups-fail-with-a-permissions-error).
:::
