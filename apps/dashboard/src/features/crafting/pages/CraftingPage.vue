<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Hammer, MapPin, Search, ChevronRight } from 'lucide-vue-next'
import { Input } from '@tsuki/ui'
import recipesData from '../recipes.json'
import dropsData from '../drops.json'
import namesData from '../names.json'

type Recipe = { n: string; a: number; m: [string, number][] }
const recipes = recipesData as Record<string, Recipe>
const drops = dropsData as Record<string, [string, string][]>
const names = namesData as Record<string, string>

const name = (id: string) => names[id] ?? recipes[id]?.n ?? id.replace(/_/g, ' ')

const craftables = Object.keys(recipes)
  .map((id) => ({ id, n: name(id) }))
  .sort((a, b) => a.n.localeCompare(b.n))

const query = ref('')
const selected = ref<string | null>(null)
const qty = ref(1)
const showList = ref(false)

const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return craftables.slice(0, 12)
  return craftables.filter((c) => c.n.toLowerCase().includes(q)).slice(0, 12)
})
function pick(id: string): void {
  selected.value = id
  query.value = name(id)
  showList.value = false
}

const batches = computed(() => {
  const r = selected.value ? recipes[selected.value] : null
  const want = Math.max(1, Math.floor(qty.value) || 1)
  return r ? Math.ceil(want / (r.a || 1)) : 1
})

const ingredients = computed(() => {
  const r = selected.value ? recipes[selected.value] : null
  if (!r) return []
  return r.m.map(([id, amt]) => ({
    id,
    name: name(id),
    amount: amt * batches.value,
    craftable: !!recipes[id],
  }))
})

function expand(id: string, need: number, acc: Map<string, number>, seen: Set<string>): void {
  const r = recipes[id]
  if (!r || seen.has(id)) {
    acc.set(id, (acc.get(id) ?? 0) + need)
    return
  }
  const b = Math.ceil(need / (r.a || 1))
  const next = new Set(seen).add(id)
  for (const [mid, amt] of r.m) expand(mid, amt * b, acc, next)
}

const rawMaterials = computed(() => {
  if (!selected.value) return []
  const acc = new Map<string, number>()
  const want = Math.max(1, Math.floor(qty.value) || 1)
  expand(selected.value, want, acc, new Set())
  return [...acc.entries()]
    .map(([id, n]) => ({ id, name: name(id), amount: n, droppers: drops[id] ?? [] }))
    .sort((a, b) => b.droppers.length - a.droppers.length || b.amount - a.amount)
})
</script>

<template>
  <section class="space-y-6">
    <div class="space-y-1">
      <h2 class="text-xl font-semibold tracking-tight">Crafting planner</h2>
      <p class="text-sm text-muted-foreground">
        Pick something to craft — see the full material breakdown and which pals drop each raw
        material (click to find them on the map).
      </p>
    </div>

    <!-- Item picker -->
    <div class="relative max-w-sm">
      <Search
        class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        v-model="query"
        placeholder="Search an item to craft…"
        class="pl-9"
        @focus="showList = true"
        @input="showList = true"
      />
      <div
        v-if="showList && matches.length"
        class="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-xl"
      >
        <button
          v-for="c in matches"
          :key="c.id"
          type="button"
          class="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
          @click="pick(c.id)"
        >
          {{ c.n }}
        </button>
      </div>
    </div>

    <template v-if="selected && recipes[selected]">
      <div class="flex items-center gap-3">
        <label class="text-sm text-muted-foreground">Quantity</label>
        <Input v-model.number="qty" type="number" min="1" class="w-24" />
        <span class="text-sm text-muted-foreground">
          → makes {{ recipes[selected].a * batches }}× {{ name(selected) }}
        </span>
      </div>

      <!-- Direct recipe -->
      <div class="rounded-2xl border border-border bg-card p-5">
        <h3 class="text-sm font-medium">Recipe</h3>
        <div class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="ing in ingredients"
            :key="ing.id"
            class="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-sm"
          >
            {{ ing.name }}
            <span class="text-muted-foreground">×{{ ing.amount }}</span>
            <ChevronRight v-if="ing.craftable" class="size-3.5 text-muted-foreground/60" />
          </span>
        </div>
      </div>

      <!-- Recursive raw materials + how to get them -->
      <div class="rounded-2xl border border-border bg-card p-5">
        <h3 class="text-sm font-medium">Raw materials &amp; where to get them</h3>
        <div class="mt-3 space-y-2.5">
          <div
            v-for="m in rawMaterials"
            :key="m.id"
            class="flex flex-col gap-1.5 border-b border-border/50 pb-2.5 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <span class="text-sm font-medium"
              >{{ m.name }} <span class="text-muted-foreground">×{{ m.amount }}</span></span
            >
            <div class="flex flex-wrap items-center gap-1.5">
              <template v-if="m.droppers.length">
                <span class="text-xs text-muted-foreground">Dropped by</span>
                <RouterLink
                  v-for="d in m.droppers.slice(0, 8)"
                  :key="d[0]"
                  :to="{ path: '/map', query: { species: d[0] } }"
                  class="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-xs hover:bg-accent hover:text-primary"
                >
                  <MapPin class="size-3" /> {{ d[1] }}
                </RouterLink>
                <span v-if="m.droppers.length > 8" class="text-xs text-muted-foreground">
                  +{{ m.droppers.length - 8 }}
                </span>
              </template>
              <span v-else class="text-xs text-muted-foreground/70"
                >Gathered / mined in the world</span
              >
            </div>
          </div>
        </div>
      </div>
    </template>

    <div
      v-else
      class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center"
    >
      <Hammer class="size-8 text-muted-foreground/50" />
      <p class="mt-3 text-sm text-muted-foreground">Search an item above to plan its crafting.</p>
    </div>
  </section>
</template>
