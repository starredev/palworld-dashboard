<script setup lang="ts">
import { computed } from 'vue'
import type { MapPoint, MapPointKind } from '@tsuki/types'

const props = defineProps<{
  points: MapPoint[]
  visible: Record<MapPointKind, boolean>
  imageUrl?: string | null
}>()

const SIZE = 1000
const PAD = 48

// Palworld (.sav) world-coordinate bounds — square, so a north-up map image aligns.
const WORLD = { minX: -582888, maxX: 335112, minY: -301000, maxY: 617000 }
const SPAN = 918000

const STYLE: Record<MapPointKind, { color: string; r: number }> = {
  player: { color: '#34d399', r: 9 },
  base: { color: '#38bdf8', r: 10 },
  pal: { color: '#fbbf24', r: 5.5 },
  wild: { color: '#a3a3a3', r: 5 },
  npc: { color: '#f87171', r: 5 },
}

const shown = computed(() => props.points.filter((p) => props.visible[p.kind]))

const autoBounds = computed(() => {
  if (shown.value.length === 0) return null
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity
  for (const p of shown.value) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, maxX, minY, maxY }
})

const projected = computed(() => {
  // With a map image: fixed world bounds so markers align with the image.
  if (props.imageUrl) {
    const scale = SIZE / SPAN
    return shown.value.map((p) => ({
      point: p,
      cx: (p.x - WORLD.minX) * scale,
      cy: SIZE - (p.y - WORLD.minY) * scale,
      ...STYLE[p.kind],
    }))
  }
  // Without image: auto-fit the visible points.
  const b = autoBounds.value
  if (!b) return []
  const rangeX = Math.max(b.maxX - b.minX, 1)
  const rangeY = Math.max(b.maxY - b.minY, 1)
  const scale = (SIZE - PAD * 2) / Math.max(rangeX, rangeY)
  const offX = (SIZE - rangeX * scale) / 2
  const offY = (SIZE - rangeY * scale) / 2
  return shown.value.map((p) => ({
    point: p,
    cx: offX + (p.x - b.minX) * scale,
    cy: SIZE - (offY + (p.y - b.minY) * scale),
    ...STYLE[p.kind],
  }))
})

function tooltip(p: MapPoint): string {
  const parts = [p.name]
  if (p.detail) parts.push(`(${p.detail})`)
  if (p.level != null) parts.push(`· Lv ${p.level}`)
  if (p.guildName) parts.push(`· ${p.guildName}`)
  return parts.join(' ')
}
</script>

<template>
  <div
    class="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-background/60"
  >
    <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="h-full w-full">
      <image v-if="imageUrl" :href="imageUrl" x="0" y="0" :width="SIZE" :height="SIZE" />
      <template v-else>
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="currentColor"
              stroke-width="0.5"
              class="text-border/50"
            />
          </pattern>
        </defs>
        <rect :width="SIZE" :height="SIZE" fill="url(#grid)" />
      </template>

      <g v-for="p in projected" :key="p.point.id">
        <circle
          :cx="p.cx"
          :cy="p.cy"
          :r="p.point.kind === 'player' && p.point.online ? p.r + 3 : p.r"
          :fill="p.color"
          :fill-opacity="p.point.kind === 'wild' || p.point.kind === 'npc' ? 0.6 : 0.95"
          stroke="#0a0a0a"
          stroke-opacity="0.6"
          stroke-width="2.5"
        >
          <title>{{ tooltip(p.point) }}</title>
        </circle>
      </g>
    </svg>
  </div>
</template>
