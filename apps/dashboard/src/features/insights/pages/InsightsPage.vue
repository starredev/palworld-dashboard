<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api } from '@/lib/api'
import TimeSeriesChart from '../components/TimeSeriesChart.vue'

const { data } = useQuery({
  queryKey: ['metrics-history'],
  queryFn: () => api.getMetricsHistory(),
  refetchInterval: 10_000,
})

const samples = computed(() => data.value?.samples ?? [])
const playerPoints = computed(() => samples.value.map((s) => ({ t: s.t, value: s.players })))
const fpsPoints = computed(() => samples.value.map((s) => ({ t: s.t, value: s.fps })))
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-1">
      <h2 class="text-xl font-semibold tracking-tight">Insights</h2>
      <p class="text-sm text-muted-foreground">
        Player count and server performance over time. History is kept in memory and builds up while
        the panel runs.
      </p>
    </header>

    <div class="grid gap-4 lg:grid-cols-2">
      <TimeSeriesChart label="Players online" :points="playerPoints" color="#34d399" />
      <TimeSeriesChart label="Server FPS" :points="fpsPoints" color="#38bdf8" :zero-based="false" />
    </div>
  </section>
</template>
