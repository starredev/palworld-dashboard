<script setup lang="ts">
import { computed } from 'vue'
import { Users, Gauge, Clock, CalendarDays, PlugZap, ServerOff } from 'lucide-vue-next'
import { formatUptime } from '@tsuki/shared'
import { useServerOverview } from '@/composables/use-server'
import StatCard from '../components/StatCard.vue'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'

const { status, metrics, info } = useServerOverview()

const statusData = computed(() => status.data.value)
const notConfigured = computed(() => statusData.value && !statusData.value.configured)
const offline = computed(() => statusData.value?.configured && !statusData.value.reachable)

const m = computed(() => metrics.data.value)
const metricsLoading = computed(
  () => metrics.isLoading.value && metrics.fetchStatus.value !== 'idle',
)

const title = computed(() => info.data.value?.name ?? 'Overview')
const subtitle = computed(() => {
  const version = info.data.value?.version
  return version ? `Palworld ${version}` : 'Live status of your Palworld server'
})

const players = computed(() =>
  m.value ? `${m.value.players}${m.value.maxPlayers ? ` / ${m.value.maxPlayers}` : ''}` : undefined,
)
const fps = computed(() => (m.value?.fps != null ? Math.round(m.value.fps) : undefined))
const uptime = computed(() => (m.value?.uptime != null ? formatUptime(m.value.uptime) : undefined))
const inGameDay = computed(() => m.value?.days ?? undefined)
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-1">
      <h2 class="text-xl font-semibold tracking-tight">{{ title }}</h2>
      <p class="text-sm text-muted-foreground">{{ subtitle }}</p>
    </header>

    <PagePlaceholder
      v-if="notConfigured"
      :icon="PlugZap"
      title="Connect your Palworld server"
      description="Set PALWORLD_REST_URL and the admin password (or the RCON host + password) in the API environment to see live metrics and players."
    />
    <PagePlaceholder
      v-else-if="offline"
      :icon="ServerOff"
      title="Server unreachable"
      description="Tsuki has connection details but couldn't reach the server. Check that it's running and the credentials are correct."
    />

    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Players" :value="players" :icon="Users" :loading="metricsLoading" />
      <StatCard label="Server FPS" :value="fps" :icon="Gauge" :loading="metricsLoading" />
      <StatCard label="Uptime" :value="uptime" :icon="Clock" :loading="metricsLoading" />
      <StatCard
        label="In-game day"
        :value="inGameDay"
        :icon="CalendarDays"
        :loading="metricsLoading"
      />
    </div>
  </section>
</template>
