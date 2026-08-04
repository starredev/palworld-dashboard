<script setup lang="ts">
import { computed } from 'vue'
import { Activity, Clock, Server, Tag } from 'lucide-vue-next'
import { formatUptime } from '@tsuki/shared'
import { useHealth } from '@/composables/use-health'
import StatCard from '../components/StatCard.vue'

const { data, isLoading, isError } = useHealth()

const status = computed(() => {
  if (isError.value) return 'Offline'
  return data.value ? 'Online' : '—'
})
const uptime = computed(() => (data.value ? formatUptime(data.value.uptime) : undefined))
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-1">
      <h2 class="text-xl font-semibold tracking-tight">Overview</h2>
      <p class="text-sm text-muted-foreground">
        Live status of your Tsuki Panel backend. Game-server metrics arrive in Phase 2.
      </p>
    </header>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="API status" :value="status" :icon="Activity" :loading="isLoading" />
      <StatCard label="Uptime" :value="uptime" :icon="Clock" :loading="isLoading" />
      <StatCard label="Service" :value="data?.service" :icon="Server" :loading="isLoading" />
      <StatCard label="Version" :value="data?.version" :icon="Tag" :loading="isLoading" />
    </div>
  </section>
</template>
