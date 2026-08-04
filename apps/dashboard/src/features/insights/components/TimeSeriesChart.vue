<script setup lang="ts">
import { computed, ref } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@tsuki/ui'

interface Point {
  t: number
  value: number | null
}

const props = withDefaults(
  defineProps<{
    points: Point[]
    label: string
    color: string
    unit?: string
    zeroBased?: boolean
    decimals?: number
  }>(),
  { unit: '', zeroBased: true, decimals: 0 },
)

const W = 640
const H = 180
const PAD = { top: 12, right: 12, bottom: 20, left: 36 }

const valid = computed(
  () => props.points.filter((p) => p.value != null) as { t: number; value: number }[],
)

const domain = computed(() => {
  const v = valid.value
  if (v.length === 0) return null
  const ts = v.map((p) => p.t)
  const vs = v.map((p) => p.value)
  const minT = Math.min(...ts)
  const maxT = Math.max(...ts)
  let minV = props.zeroBased ? 0 : Math.min(...vs)
  let maxV = Math.max(...vs)
  if (maxV === minV) maxV = minV + 1
  maxV += (maxV - minV) * 0.12
  return { minT, maxT: maxT === minT ? minT + 1 : maxT, minV, maxV }
})

function sx(t: number): number {
  const d = domain.value!
  return PAD.left + ((t - d.minT) / (d.maxT - d.minT)) * (W - PAD.left - PAD.right)
}
function sy(v: number): number {
  const d = domain.value!
  return H - PAD.bottom - ((v - d.minV) / (d.maxV - d.minV)) * (H - PAD.top - PAD.bottom)
}

const linePath = computed(() => {
  const d = domain.value
  if (!d) return ''
  // Break the path on gaps (null values).
  let path = ''
  let pen = false
  for (const p of props.points) {
    if (p.value == null) {
      pen = false
      continue
    }
    path += `${pen ? 'L' : 'M'}${sx(p.t).toFixed(1)} ${sy(p.value).toFixed(1)} `
    pen = true
  }
  return path.trim()
})

const areaPath = computed(() => {
  const v = valid.value
  if (v.length < 2 || !domain.value) return ''
  const base = H - PAD.bottom
  const top = v.map((p) => `L${sx(p.t).toFixed(1)} ${sy(p.value).toFixed(1)}`).join(' ')
  return `M${sx(v[0].t).toFixed(1)} ${base} ${top} L${sx(v[v.length - 1].t).toFixed(1)} ${base} Z`
})

const current = computed(() => valid.value.at(-1)?.value ?? null)
function fmt(v: number | null): string {
  return v == null ? '—' : `${v.toFixed(props.decimals)}${props.unit}`
}

// hover crosshair
const svgRef = ref<SVGSVGElement>()
const hoverIdx = ref<number | null>(null)
function onMove(e: MouseEvent): void {
  const v = valid.value
  const rect = svgRef.value?.getBoundingClientRect()
  if (!rect || v.length === 0 || !domain.value) return
  const x = ((e.clientX - rect.left) / rect.width) * W
  let best = 0
  let bestD = Infinity
  v.forEach((p, i) => {
    const d = Math.abs(sx(p.t) - x)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  hoverIdx.value = best
}
const hover = computed(() => (hoverIdx.value == null ? null : valid.value[hoverIdx.value]))
const gid = `grad-${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-baseline justify-between">
      <CardTitle class="text-foreground">{{ label }}</CardTitle>
      <span class="text-lg font-semibold tracking-tight">{{ fmt(current) }}</span>
    </CardHeader>
    <CardContent>
      <div v-if="!domain" class="grid h-[180px] place-items-center text-sm text-muted-foreground">
        Collecting data…
      </div>
      <svg
        v-else
        ref="svgRef"
        :viewBox="`0 0 ${W} ${H}`"
        class="w-full"
        @mousemove="onMove"
        @mouseleave="hoverIdx = null"
      >
        <defs>
          <linearGradient :id="gid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="color" stop-opacity="0.28" />
            <stop offset="100%" :stop-color="color" stop-opacity="0" />
          </linearGradient>
        </defs>

        <line
          :x1="PAD.left"
          :y1="sy(domain.maxV)"
          :x2="W - PAD.right"
          :y2="sy(domain.maxV)"
          stroke="currentColor"
          stroke-opacity="0.08"
        />
        <line
          :x1="PAD.left"
          :y1="sy(domain.minV)"
          :x2="W - PAD.right"
          :y2="sy(domain.minV)"
          stroke="currentColor"
          stroke-opacity="0.08"
        />
        <text
          :x="PAD.left - 6"
          :y="sy(domain.maxV) + 4"
          text-anchor="end"
          class="fill-muted-foreground text-[10px]"
        >
          {{ fmt(domain.maxV) }}
        </text>
        <text
          :x="PAD.left - 6"
          :y="sy(domain.minV) + 4"
          text-anchor="end"
          class="fill-muted-foreground text-[10px]"
        >
          {{ fmt(domain.minV) }}
        </text>

        <path :d="areaPath" :fill="`url(#${gid})`" />
        <path
          :d="linePath"
          fill="none"
          :stroke="color"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        <g v-if="hover">
          <line
            :x1="sx(hover.t)"
            y1="0"
            :x2="sx(hover.t)"
            :y2="H - PAD.bottom"
            stroke="currentColor"
            stroke-opacity="0.2"
          />
          <circle :cx="sx(hover.t)" :cy="sy(hover.value)" r="3.5" :fill="color" />
        </g>
      </svg>
      <div v-if="hover" class="mt-1 text-center text-xs text-muted-foreground">
        {{ fmt(hover.value) }} ·
        {{ new Date(hover.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
      </div>
    </CardContent>
  </Card>
</template>
