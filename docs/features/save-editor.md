# Save editor

The deep editor for players, pals, guilds and inventories — reading and writing the game save directly. It's the most powerful part of the panel, and the most carefully guarded.

**Needs:** the [data dir mounted **and** Docker container control](/installation/data-mount), plus the **admin** role. Curious how it works internally? See [How the save editor works](/guide/save-editor-internals).

## The batch: queue, then apply once

Instead of restarting the server for every change, edits **queue into a batch**:

1. Make any number of edits across players, pals, guilds and inventories — each one **adds to the batch** rather than applying immediately.
2. A floating **batch bar** (bottom-right) shows the pending list; remove individual items or clear it.
3. Hit **Apply all & restart** (with a confirmation). Everything applies in a single **stop → automatic backup → edit → start** cycle.

Partial failures are reported per-edit (and don't block the others). The queue persists across API restarts.

::: tip One backup, one restart
Because edits batch, a whole session of changes costs exactly one server restart and leaves exactly one fresh pre-edit backup. You can always restore it from the [Backups](/features/backups) page.
:::

## Where to find it

Open a player from the **Players** page (online or offline roster), then the **Save data** section in their detail dialog. Guild edits live on the **Guilds** page. Inventory actions are in the player's **Inventory** panel.

## Teleport

Move a player anywhere by editing their saved position.

- Enter X / Y / Z (same coordinate space as the map), or **copy a position from another player**.
- Works for **Xbox / Game Pass** players too — the live `TeleportToPlayer` command is Steam-only, but editing the save is platform-independent.

## Players

From a player's **Save data** section:

- **Set level** and **exp**, and edit the **nickname**.
- **Stat points** — Health, Stamina, Attack, Weight, Capture rate, Work speed.
- **Refuel** — top up hunger and sanity.
- **Add gold**.

## Pals

Load a player's pals, then click one to edit:

- **Level** and **IVs / talents** (HP, Shot, Defense).
- **Condensation stars** (0–4).
- **Fully heal** (HP, hunger, cure sickness).
- **Passive skills** — add/remove up to four, including the movement-speed passives (Swift/Runner/Nimble) that also speed up flying mounts.
- **Duplicate** a pal, or **copy** it into another player's Pal Box.

## Guilds

On the **Guilds** page (admins):

- **Rename** a guild.
- **Hand over leadership** to another member.
- **Kick** a member. Personal/solo guilds are supported.

## Inventory

View a player's items (with names, icons and categories), grouped by container. As an admin you can:

- **Give item** — from a searchable, dataset-backed picker (2,300+ items). Results are ranked so an exact match surfaces first.
- **Transfer** an item to another player — it's pulled from wherever it sits in the source player's containers and added to the target's main inventory.
- **Delete** an item — a trash button on each row removes that stack.

Each of these queues into the batch like every other edit.

::: warning Test first, keep backups
The save editor is powerful and, like any save tool, can corrupt a world if something unexpected happens. Every apply auto-backs-up, but you should still test on a copy and keep your own backups of worlds you care about.
:::
