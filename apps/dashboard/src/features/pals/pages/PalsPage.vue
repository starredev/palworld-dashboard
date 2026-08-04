<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { PawPrint, Search, ChevronUp, ChevronDown } from 'lucide-vue-next'
import type { Pal } from '@tsuki/types'
import { Card, Skeleton, Input } from '@tsuki/ui'
import { api } from '@/lib/api'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'

type SortKey = 'name' | 'species' | 'level'

const { data, isLoading } = useQuery({
  queryKey: ['pals'],
  queryFn: () => api.getPals(),
  refetchInterval: 30_000,
})
const pals = computed(() => data.value?.pals ?? [])
const unavailable = computed(() => data.value && !data.value.available)

const search = ref('')
const sortKey = ref<SortKey>('level')
const sortDir = ref<'asc' | 'desc'>('desc')
const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'species', label: 'Species' },
  { key: 'level', label: 'Level' },
]

function onSort(key: SortKey): void {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
    sortDir.value = key === 'level' ? 'desc' : 'asc'
  }
}

function compare(a: Pal, b: Pal): number {
  if (sortKey.value === 'level') return (a.level ?? -1) - (b.level ?? -1)
  return (a[sortKey.value] ?? '').localeCompare(b[sortKey.value] ?? '')
}

const displayed = computed(() => {
  const q = search.value.trim().toLowerCase()
  const filtered = q
    ? pals.value.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.species ?? '').toLowerCase().includes(q) ||
          (p.guildName ?? '').toLowerCase().includes(q),
      )
    : pals.value
  const sorted = [...filtered].sort(compare)
  return sortDir.value === 'desc' ? sorted.reverse() : sorted
})
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div class="space-y-1">
        <h2 class="text-xl font-semibold tracking-tight">Pals</h2>
        <p class="text-sm text-muted-foreground">
          Base Pals across all guilds, from your save data.
        </p>
      </div>
      <div v-if="pals.length" class="relative">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input v-model="search" placeholder="Search pals…" class="w-56 pl-9" />
      </div>
    </header>

    <div v-if="isLoading" class="space-y-2">
      <Skeleton v-for="n in 5" :key="n" class="h-12 w-full" />
    </div>

    <PagePlaceholder
      v-else-if="unavailable"
      :icon="PawPrint"
      title="Pal data unavailable"
      description="Point the API at your live-map GameData endpoint (set GAMEDATA_URL) to see Pals."
    />
    <PagePlaceholder
      v-else-if="pals.length === 0"
      :icon="PawPrint"
      title="No Pals found"
      description="Base Pals will appear here once your guilds assign them to bases."
    />
    <PagePlaceholder
      v-else-if="displayed.length === 0"
      :icon="Search"
      title="No matches"
      :description="`No Pals match '${search}'.`"
    />

    <Card v-else class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-left text-xs text-muted-foreground">
              <th v-for="col in COLUMNS" :key="col.key" class="px-5 py-3 font-medium">
                <button
                  class="flex items-center gap-1 hover:text-foreground"
                  @click="onSort(col.key)"
                >
                  {{ col.label }}
                  <ChevronUp v-if="sortKey === col.key && sortDir === 'asc'" class="size-3" />
                  <ChevronDown
                    v-else-if="sortKey === col.key && sortDir === 'desc'"
                    class="size-3"
                  />
                </button>
              </th>
              <th class="px-5 py-3 font-medium">Guild</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="pal in displayed"
              :key="pal.id"
              class="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40"
            >
              <td class="px-5 py-3 font-medium">{{ pal.name }}</td>
              <td class="px-5 py-3 text-muted-foreground">{{ pal.species ?? '—' }}</td>
              <td class="px-5 py-3 text-muted-foreground">{{ pal.level ?? '—' }}</td>
              <td class="px-5 py-3 text-muted-foreground">{{ pal.guildName ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </section>
</template>
