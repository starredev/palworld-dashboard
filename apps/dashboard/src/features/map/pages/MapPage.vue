<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { ExternalLink, Map as MapIcon } from 'lucide-vue-next'
import type { MapPoint, MapPointKind } from '@tsuki/types'
import { Button, Card, Skeleton, cn } from '@tsuki/ui'
import { api } from '@/lib/api'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'
import CoordinateMap from '../components/CoordinateMap.vue'
import poiData from '../pois.json'

// Static points of interest (tower bosses, field alphas) — fixed world locations.
const pois = poiData as MapPoint[]

const config = useQuery({ queryKey: ['config'], queryFn: () => api.getConfig() })
const map = useQuery({
  queryKey: ['map'],
  queryFn: () => api.getMapPoints(),
  refetchInterval: 20_000,
})

const points = computed(() => [...(map.data.value?.points ?? []), ...pois])
const unavailable = computed(() => map.data.value && !map.data.value.available)

const liveMapUrl = computed(() => {
  if (config.data.value?.liveMapUrl) return config.data.value.liveMapUrl
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:3001`
})
const mapImageUrl = computed(() => config.data.value?.mapImageUrl ?? null)
const mapBounds = computed(() => config.data.value?.mapBounds)

const LAYERS: { kind: MapPointKind; label: string; color: string }[] = [
  { kind: 'player', label: 'Players', color: '#34d399' },
  { kind: 'base', label: 'Bases', color: '#38bdf8' },
  { kind: 'pal', label: 'Pals', color: '#fbbf24' },
  { kind: 'wild', label: 'Wild', color: '#a3a3a3' },
  { kind: 'npc', label: 'NPCs', color: '#f87171' },
  { kind: 'boss', label: 'Bosses', color: '#c084fc' },
  { kind: 'alpha', label: 'Alphas', color: '#fb923c' },
]

const visible = reactive<Record<MapPointKind, boolean>>({
  player: true,
  base: true,
  pal: true,
  wild: true,
  npc: true,
  boss: true,
  alpha: false,
})

function count(kind: MapPointKind): number {
  return points.value.filter((p) => p.kind === kind).length
}
</script>

<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div class="space-y-1">
        <h2 class="text-xl font-semibold tracking-tight">Map</h2>
        <p class="text-sm text-muted-foreground">
          Live positions from your save data — refreshes each save (~1 min), not smooth movement.
        </p>
      </div>
      <a :href="liveMapUrl" target="_blank" rel="noopener noreferrer">
        <Button variant="outline"><ExternalLink />Open full live map</Button>
      </a>
    </header>

    <div v-if="map.isLoading.value" class="space-y-3">
      <Skeleton class="aspect-square w-full" />
    </div>

    <PagePlaceholder
      v-else-if="unavailable"
      :icon="MapIcon"
      title="Map data unavailable"
      description="Point the API at your live-map GameData endpoint (set GAMEDATA_URL) to plot positions here."
    />
    <PagePlaceholder
      v-else-if="points.length === 0"
      :icon="MapIcon"
      title="Nothing to plot yet"
      description="Player, base and Pal positions will appear here from your save data."
    />

    <template v-else>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="layer in LAYERS"
          :key="layer.kind"
          type="button"
          :class="
            cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              visible[layer.kind]
                ? 'border-border bg-card'
                : 'border-border/50 text-muted-foreground/60',
            )
          "
          @click="visible[layer.kind] = !visible[layer.kind]"
        >
          <span
            class="size-2.5 rounded-full"
            :style="{ backgroundColor: layer.color, opacity: visible[layer.kind] ? 1 : 0.4 }"
          />
          {{ layer.label }}
          <span class="text-muted-foreground/70">{{ count(layer.kind) }}</span>
        </button>
      </div>

      <Card class="p-3 sm:p-4">
        <CoordinateMap
          :points="points"
          :visible="visible"
          :image-url="mapImageUrl"
          :bounds="mapBounds"
        />
      </Card>
    </template>
  </section>
</template>
