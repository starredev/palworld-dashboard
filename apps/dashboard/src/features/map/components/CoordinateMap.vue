<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Plus, Minus, Maximize } from 'lucide-vue-next'
import type { MapPoint, MapPointKind } from '@tsuki/types'

const props = defineProps<{
  points: MapPoint[]
  visible: Record<MapPointKind, boolean>
  imageUrl?: string | null
  /** World bounds of the image: [xTopLeft, yTopLeft, xBottomRight, yBottomRight]. */
  bounds?: [number, number, number, number]
}>()

const SIZE = 1000
const PAD = 48
const MIN_W = SIZE * 0.1

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
  if (props.imageUrl && props.bounds) {
    const [xTL, yTL, xBR, yBR] = props.bounds
    return shown.value.map((p) => ({
      point: p,
      cx: ((p.x - xTL) / (xBR - xTL)) * SIZE,
      cy: ((p.y - yTL) / (yBR - yTL)) * SIZE,
      ...STYLE[p.kind],
    }))
  }
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

// ---- pan / zoom via the SVG viewBox ----
const wrapperRef = ref<HTMLElement>()
const svgRef = ref<SVGSVGElement>()
const view = reactive({ x: 0, y: 0, w: SIZE, h: SIZE })
const dragging = ref(false)
const hovered = ref<{ point: MapPoint; x: number; y: number } | null>(null)

function onHover(point: MapPoint, e: MouseEvent): void {
  if (dragging.value) return
  const rect = wrapperRef.value?.getBoundingClientRect()
  if (!rect) return
  hovered.value = { point, x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function subLabel(p: MapPoint): string {
  const parts: string[] = []
  if (p.detail) parts.push(p.detail)
  if (p.level != null) parts.push(`Lv ${p.level}`)
  if (p.guildName) parts.push(p.guildName)
  return parts.join(' · ')
}
const zoomScale = computed(() => view.w / SIZE) // keep markers constant on screen

function clampView(): void {
  view.w = Math.min(Math.max(view.w, MIN_W), SIZE)
  view.h = view.w
  view.x = Math.min(Math.max(view.x, 0), SIZE - view.w)
  view.y = Math.min(Math.max(view.y, 0), SIZE - view.h)
}

function zoomAt(px: number, py: number, factor: number): void {
  const cx = view.x + px * view.w
  const cy = view.y + py * view.h
  view.w *= factor
  view.h = view.w
  view.x = cx - px * view.w
  view.y = cy - py * view.h
  clampView()
}

function onWheel(e: WheelEvent): void {
  const rect = svgRef.value?.getBoundingClientRect()
  if (!rect) return
  zoomAt(
    (e.clientX - rect.left) / rect.width,
    (e.clientY - rect.top) / rect.height,
    e.deltaY > 0 ? 1.2 : 1 / 1.2,
  )
}

function onPointerDown(e: PointerEvent): void {
  dragging.value = true
  hovered.value = null
  ;(e.target as Element).setPointerCapture?.(e.pointerId)
}
function onPointerMove(e: PointerEvent): void {
  if (!dragging.value) return
  const rect = svgRef.value?.getBoundingClientRect()
  if (!rect) return
  view.x -= (e.movementX / rect.width) * view.w
  view.y -= (e.movementY / rect.height) * view.h
  clampView()
}
function onPointerUp(): void {
  dragging.value = false
}
function reset(): void {
  view.x = 0
  view.y = 0
  view.w = SIZE
  view.h = SIZE
}
</script>

<template>
  <div
    ref="wrapperRef"
    class="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-background/60"
  >
    <svg
      ref="svgRef"
      :viewBox="`${view.x} ${view.y} ${view.w} ${view.h}`"
      :class="[
        'h-full w-full touch-none select-none',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
      ]"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
    >
      <image v-if="imageUrl && bounds" :href="imageUrl" x="0" y="0" :width="SIZE" :height="SIZE" />
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
          :r="(p.point.kind === 'player' && p.point.online ? p.r + 3 : p.r) * zoomScale"
          :fill="p.color"
          :fill-opacity="p.point.kind === 'wild' || p.point.kind === 'npc' ? 0.6 : 0.95"
          stroke="#0a0a0a"
          stroke-opacity="0.6"
          :stroke-width="2.5 * zoomScale"
          class="cursor-pointer"
          @mousemove="onHover(p.point, $event)"
          @mouseleave="hovered = null"
        />
      </g>
    </svg>

    <div
      v-if="hovered"
      class="pointer-events-none absolute z-10 max-w-[16rem] rounded-lg border border-border bg-card/95 px-2.5 py-1.5 text-xs shadow-xl backdrop-blur"
      :style="{ left: `${hovered.x + 12}px`, top: `${hovered.y + 12}px` }"
    >
      <span class="font-medium">{{ hovered.point.name }}</span>
      <span v-if="subLabel(hovered.point)" class="block text-muted-foreground">
        {{ subLabel(hovered.point) }}
      </span>
    </div>

    <div class="absolute right-3 top-3 flex flex-col gap-1.5">
      <button
        class="grid size-8 place-items-center rounded-lg border border-border bg-card/80 backdrop-blur hover:bg-accent"
        aria-label="Zoom in"
        @click="zoomAt(0.5, 0.5, 1 / 1.4)"
      >
        <Plus class="size-4" />
      </button>
      <button
        class="grid size-8 place-items-center rounded-lg border border-border bg-card/80 backdrop-blur hover:bg-accent"
        aria-label="Zoom out"
        @click="zoomAt(0.5, 0.5, 1.4)"
      >
        <Minus class="size-4" />
      </button>
      <button
        class="grid size-8 place-items-center rounded-lg border border-border bg-card/80 backdrop-blur hover:bg-accent"
        aria-label="Reset view"
        @click="reset"
      >
        <Maximize class="size-4" />
      </button>
    </div>
  </div>
</template>
