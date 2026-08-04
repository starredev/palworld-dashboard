<script setup lang="ts">
import { computed } from 'vue'
import { Users, PlugZap, ServerOff } from 'lucide-vue-next'
import { Skeleton } from '@tsuki/ui'
import { useServerStatus } from '@/composables/use-server'
import { usePlayers } from '@/composables/use-players'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'
import PlayerTable from '../components/PlayerTable.vue'

const status = useServerStatus()
const statusData = computed(() => status.data.value)
const reachable = computed(() => statusData.value?.reachable === true)
const notConfigured = computed(() => statusData.value && !statusData.value.configured)
const offline = computed(() => statusData.value?.configured && !statusData.value.reachable)

const players = usePlayers(reachable)
const list = computed(() => players.data.value?.players ?? [])
const loading = computed(() => reachable.value && players.isLoading.value)
</script>

<template>
  <section class="space-y-6">
    <header class="flex items-end justify-between">
      <div class="space-y-1">
        <h2 class="text-xl font-semibold tracking-tight">Players</h2>
        <p class="text-sm text-muted-foreground">
          {{ reachable ? `${list.length} online` : 'Online players on your server' }}
        </p>
      </div>
    </header>

    <PagePlaceholder
      v-if="notConfigured"
      :icon="PlugZap"
      title="Connect your Palworld server"
      description="Configure the REST or RCON connection in the API environment to list online players."
    />
    <PagePlaceholder
      v-else-if="offline"
      :icon="ServerOff"
      title="Server unreachable"
      description="Couldn't reach the Palworld server. Check that it's running and reachable from the panel."
    />
    <div v-else-if="loading" class="space-y-2">
      <Skeleton v-for="n in 5" :key="n" class="h-12 w-full" />
    </div>
    <PagePlaceholder
      v-else-if="list.length === 0"
      :icon="Users"
      title="No players online"
      description="When players join your server, they'll appear here."
    />
    <PlayerTable v-else :players="list" />
  </section>
</template>
