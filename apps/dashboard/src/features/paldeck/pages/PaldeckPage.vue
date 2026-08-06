<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { BookOpen, Loader2, PlugZap } from 'lucide-vue-next'
import { api } from '@/lib/api'
import { useSaveStatus } from '@/composables/use-save-editor'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'
import data from '../pals.json'

interface PalEntry {
  dex: number
  id: string
  name: string
  elements: string[]
  rarity: number
}
const pals = data.pals as PalEntry[]
const idToDex = data.idToDex as Record<string, number>

const saveStatus = useSaveStatus()
const available = computed(() => saveStatus.data.value?.available === true)

const paldeck = useQuery({
  queryKey: ['paldeck'],
  queryFn: () => api.getPaldeck(),
  enabled: available,
  staleTime: 60_000,
})
const owners = computed(() => paldeck.data.value?.owners ?? [])

const filter = ref('all') // 'all' (server-wide) | a player uid
const ownedDex = computed<Set<number>>(() => {
  const set = new Set<number>()
  const add = (species: string[]) =>
    species.forEach((s) => {
      const d = idToDex[s.toLowerCase()]
      if (d) set.add(d)
    })
  if (filter.value === 'all') owners.value.forEach((o) => add(o.species))
  else {
    const o = owners.value.find((x) => x.uid === filter.value)
    if (o) add(o.species)
  }
  return set
})
const ownedCount = computed(() => pals.filter((p) => ownedDex.value.has(p.dex)).length)

const broken = ref<Set<string>>(new Set())
const icon = (id: string) => `https://palworld.gg/images/full_palicon/T_${id}_icon_normal.png`
function onImgError(id: string): void {
  broken.value = new Set(broken.value).add(id)
}

const ELEMENT_COLORS: Record<string, string> = {
  Normal: '#a1a1aa',
  Fire: '#f97316',
  Water: '#38bdf8',
  Leaf: '#4ade80',
  Electric: '#facc15',
  Electricity: '#facc15',
  Ice: '#67e8f9',
  Ground: '#c9a227',
  Dark: '#a78bfa',
  Dragon: '#818cf8',
}
const elemColor = (e?: string) => (e && ELEMENT_COLORS[e]) || '#71717a'
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div class="space-y-1">
        <h2 class="text-xl font-semibold tracking-tight">Paldeck</h2>
        <p class="text-sm text-muted-foreground">
          {{ ownedCount }} / {{ pals.length }} captured
          {{ filter === 'all' ? 'on the server' : '' }}
        </p>
      </div>
      <select
        v-if="available && owners.length"
        v-model="filter"
        class="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="all">Everyone (server)</option>
        <option v-for="o in owners" :key="o.uid" :value="o.uid">
          {{ o.name ?? o.uid.slice(0, 8) }} · {{ o.species.length }}
        </option>
      </select>
    </header>

    <PagePlaceholder
      v-if="!available"
      :icon="PlugZap"
      title="Save editor not available"
      description="The Paldeck reads owned pals from the save. Enable the save editor (converter + save dir) to populate it."
    />
    <p
      v-else-if="paldeck.isLoading.value"
      class="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <Loader2 class="size-4 animate-spin" /> Reading the save…
    </p>
    <PagePlaceholder
      v-else-if="paldeck.isError.value"
      :icon="BookOpen"
      title="Couldn't read the Paldeck"
      :description="(paldeck.error.value as Error)?.message ?? 'Failed to read the save.'"
    />

    <div
      v-else
      class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
    >
      <div
        v-for="pal in pals"
        :key="pal.dex"
        class="rounded-xl border border-border bg-card p-2.5 text-center transition"
        :class="ownedDex.has(pal.dex) ? '' : 'opacity-40 grayscale'"
      >
        <div class="relative mx-auto grid size-14 place-items-center">
          <img
            v-if="!broken.has(pal.id)"
            :src="icon(pal.id)"
            :alt="pal.name"
            loading="lazy"
            class="size-14 object-contain"
            @error="onImgError(pal.id)"
          />
          <span
            v-else
            class="grid size-11 place-items-center rounded-full text-xs font-semibold"
            :style="{
              backgroundColor: elemColor(pal.elements[0]) + '33',
              color: elemColor(pal.elements[0]),
            }"
          >
            {{ pal.name.charAt(0) }}
          </span>
          <span
            v-if="ownedDex.has(pal.dex)"
            class="absolute -right-1 -top-1 size-2.5 rounded-full bg-emerald-400 ring-2 ring-card"
          />
        </div>
        <p class="mt-1.5 truncate text-xs font-medium" :title="pal.name">{{ pal.name }}</p>
        <div class="mt-1 flex items-center justify-center gap-1.5">
          <span class="text-[10px] text-muted-foreground">#{{ pal.dex }}</span>
          <span
            v-for="e in pal.elements"
            :key="e"
            class="size-1.5 rounded-full"
            :style="{ backgroundColor: elemColor(e) }"
            :title="e"
          />
        </div>
      </div>
    </div>
  </section>
</template>
