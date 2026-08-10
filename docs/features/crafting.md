# Crafting planner

Pick something to craft and get the full picture: every ingredient, the recursive raw-material totals, and exactly how to get each raw material.

Entirely client-side — it uses bundled datasets, so it needs no server connection.

## What it shows

1. **Direct recipe** — the immediate ingredients and their counts, scaled to the quantity you want. Sub-craftable ingredients are marked so you can expand them.
2. **Raw-material totals** — a recursive breakdown (with cycle-guarding) down to base materials, summed across the whole tree.
3. **Where to get each material** — for every raw material:
   - the **pals that drop it**, as links to the [map](/features/world#find-where-a-species-roams) showing where those pals are right now;
   - or a **gathering method** for materials with no droppers (e.g. *Chop trees*, *Mine ore deposits*, *Mine blue Paldium crystals*, *Grow at a plantation*).

## Example

Planning a **Plasteel** chain shows you need its ingredients, drills down to the ores and wood involved, totals them, and — for each ore — links to the map to find the pals that mine/drop it.

## How to use it

- Open the **Crafting** page.
- Search and pick an item, set a quantity.
- Follow the ▸ markers to expand sub-recipes, and the pal links to the map.

::: info Data source
Recipes and drop tables are bundled from community datasets and keyed to the game's internal item and pal ids. Boss variants fold to their base species for drop lookups.
:::
