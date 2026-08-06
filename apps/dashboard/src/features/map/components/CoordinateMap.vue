<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Plus, Minus, Maximize } from 'lucide-vue-next'
import type { MapPoint, MapPointKind } from '@tsuki/types'

const props = defineProps<{
  points: MapPoint[]
  visible: Record<MapPointKind, boolean>
  imageUrl?: string | null
  /** World bounds of the image: [xTopLeft, yTopLeft, xBottomRight, yBottomRight]. */
  bounds?: [number, number, number, number]
  /** Translucent world-space circles (e.g. species habitat areas), in world units. */
  areas?: { x: number; y: number; r: number }[]
}>()

const SIZE = 1000
const PAD = 48
const MAX_ZOOM = 8

const STYLE: Record<MapPointKind, { color: string; size: number; op: number }> = {
  player: { color: '#34d399', size: 16, op: 0.95 },
  base: { color: '#38bdf8', size: 18, op: 0.95 },
  pal: { color: '#fbbf24', size: 11, op: 0.95 },
  wild: { color: '#a3a3a3', size: 10, op: 0.6 },
  npc: { color: '#f87171', size: 10, op: 0.6 },
  boss: { color: '#c084fc', size: 14, op: 0.95 },
  alpha: { color: '#fb923c', size: 10, op: 0.85 },
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

/** Point positions in a fixed 0..SIZE space (image mode) or auto-fit (grid mode). */
const projected = computed(() => {
  if (props.imageUrl && props.bounds) {
    const [xTL, yTL, xBR, yBR] = props.bounds
    return shown.value.map((p) => ({
      point: p,
      nx: (p.x - xTL) / (xBR - xTL),
      ny: (p.y - yTL) / (yBR - yTL),
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
    nx: (offX + (p.x - b.minX) * scale) / SIZE,
    ny: (SIZE - (offY + (p.y - b.minY) * scale)) / SIZE,
    ...STYLE[p.kind],
  }))
})

/** Project world-space area circles into the same 0..1 space as the points. */
const areaCircles = computed(() => {
  const areas = props.areas ?? []
  if (!areas.length) return []
  if (props.imageUrl && props.bounds) {
    const [xTL, yTL, xBR, yBR] = props.bounds
    const span = Math.max(Math.abs(xBR - xTL), Math.abs(yBR - yTL)) || 1
    return areas.map((a) => ({
      ncx: (a.x - xTL) / (xBR - xTL),
      ncy: (a.y - yTL) / (yBR - yTL),
      nr: a.r / span,
    }))
  }
  const b = autoBounds.value
  if (!b) return []
  const rangeX = Math.max(b.maxX - b.minX, 1)
  const rangeY = Math.max(b.maxY - b.minY, 1)
  const scale = (SIZE - PAD * 2) / Math.max(rangeX, rangeY)
  const offX = (SIZE - rangeX * scale) / 2
  const offY = (SIZE - rangeY * scale) / 2
  return areas.map((a) => ({
    ncx: (offX + (a.x - b.minX) * scale) / SIZE,
    ncy: (SIZE - (offY + (a.y - b.minY) * scale)) / SIZE,
    nr: (a.r * scale) / SIZE,
  }))
})

// ---- pan / zoom via GPU-composited CSS transform ----
const wrapperRef = ref<HTMLElement>()
const size = ref(1)
const view = reactive({ k: 1, tx: 0, ty: 0 })
const dragging = ref(false)
const hovered = ref<{ point: MapPoint; x: number; y: number } | null>(null)

const layerStyle = computed(() => ({
  transform: `translate3d(${view.tx}px, ${view.ty}px, 0) scale(${view.k})`,
  transformOrigin: '0 0',
  willChange: 'transform',
}))

const markers = computed(() =>
  projected.value.map((p) => ({
    ...p,
    left: view.tx + p.nx * size.value * view.k,
    top: view.ty + p.ny * size.value * view.k,
  })),
)

// Area circles scale WITH the map (they cover a world region), unlike markers.
const areaMarkers = computed(() =>
  areaCircles.value.map((c) => ({
    left: view.tx + c.ncx * size.value * view.k,
    top: view.ty + c.ncy * size.value * view.k,
    d: c.nr * 2 * size.value * view.k,
  })),
)

function clampView(): void {
  view.k = Math.min(Math.max(view.k, 1), MAX_ZOOM)
  const min = size.value * (1 - view.k)
  view.tx = Math.min(Math.max(view.tx, min), 0)
  view.ty = Math.min(Math.max(view.ty, min), 0)
}

function zoomAt(px: number, py: number, factor: number): void {
  const k2 = Math.min(Math.max(view.k * factor, 1), MAX_ZOOM)
  view.tx = px - ((px - view.tx) / view.k) * k2
  view.ty = py - ((py - view.ty) / view.k) * k2
  view.k = k2
  clampView()
}

function onWheel(e: WheelEvent): void {
  const rect = wrapperRef.value?.getBoundingClientRect()
  if (!rect) return
  zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.2 : 1 / 1.2)
}

// Coalesce pan updates to one per animation frame.
let rafId = 0
let pending: { dx: number; dy: number } | null = null
function schedulePan(dx: number, dy: number): void {
  pending = pending ? { dx: pending.dx + dx, dy: pending.dy + dy } : { dx, dy }
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    if (!pending) return
    view.tx += pending.dx
    view.ty += pending.dy
    pending = null
    clampView()
  })
}

function onPointerDown(e: PointerEvent): void {
  dragging.value = true
  hovered.value = null
  ;(e.target as Element).setPointerCapture?.(e.pointerId)
}
function onPointerMove(e: PointerEvent): void {
  if (dragging.value) schedulePan(e.movementX, e.movementY)
}
function onPointerUp(): void {
  dragging.value = false
}
function reset(): void {
  view.k = 1
  view.tx = 0
  view.ty = 0
}

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

let ro: ResizeObserver | undefined
onMounted(() => {
  const el = wrapperRef.value
  if (!el) return
  size.value = el.clientWidth
  ro = new ResizeObserver(() => {
    size.value = el.clientWidth
    clampView()
  })
  ro.observe(el)
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div
    ref="wrapperRef"
    :class="[
      'relative aspect-square w-full touch-none select-none overflow-hidden rounded-2xl border border-border bg-background/60',
      dragging ? 'cursor-grabbing' : 'cursor-grab',
    ]"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <!-- GPU-transformed background layer (image or grid) -->
    <div class="absolute inset-0" :style="layerStyle">
      <img
        v-if="imageUrl && bounds"
        :src="imageUrl"
        alt="Palworld map"
        draggable="false"
        class="absolute inset-0 h-full w-full object-cover"
      />
      <div
        v-else
        class="absolute inset-0"
        style="
          background-image:
            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
          background-size: 5% 5%;
        "
      />
    </div>

    <!-- Species habitat circles (scale with the map) -->
    <div class="pointer-events-none absolute inset-0">
      <div
        v-for="(a, i) in areaMarkers"
        :key="`area-${i}`"
        class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        :style="{
          left: `${a.left}px`,
          top: `${a.top}px`,
          width: `${a.d}px`,
          height: `${a.d}px`,
          background: 'rgba(251,191,36,0.12)',
          border: '1.5px solid rgba(251,191,36,0.55)',
        }"
      />
    </div>

    <!-- Marker overlay (constant screen size) -->
    <div class="pointer-events-none absolute inset-0">
      <div
        v-for="m in markers"
        :key="m.point.id"
        class="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full"
        :style="{
          left: `${m.left}px`,
          top: `${m.top}px`,
          width: `${m.size}px`,
          height: `${m.size}px`,
          background: m.color,
          opacity: m.op,
          border: '2px solid rgba(10,10,10,0.55)',
        }"
        @mousemove="onHover(m.point, $event)"
        @mouseleave="hovered = null"
      />
    </div>

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
        @click="zoomAt(size / 2, size / 2, 1.4)"
      >
        <Plus class="size-4" />
      </button>
      <button
        class="grid size-8 place-items-center rounded-lg border border-border bg-card/80 backdrop-blur hover:bg-accent"
        aria-label="Zoom out"
        @click="zoomAt(size / 2, size / 2, 1 / 1.4)"
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
