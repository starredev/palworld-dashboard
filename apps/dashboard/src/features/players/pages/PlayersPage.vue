<script setup lang="ts">
import { computed, ref } from 'vue'
import { Users, PlugZap, ServerOff } from 'lucide-vue-next'
import type { PalPlayer } from '@tsuki/types'
import { Skeleton, ConfirmDialog } from '@tsuki/ui'
import { useServerStatus } from '@/composables/use-server'
import { usePlayers } from '@/composables/use-players'
import { useServerCommands } from '@/composables/use-commands'
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

const { kick, ban } = useServerCommands()
const actingId = ref<string | null>(null)
const banTarget = ref<PalPlayer | null>(null)

function onKick(player: PalPlayer): void {
  if (!player.userId) return
  actingId.value = player.userId
  kick.mutate(player.userId, { onSettled: () => (actingId.value = null) })
}

function confirmBan(): void {
  const id = banTarget.value?.userId
  if (!id) return
  actingId.value = id
  ban.mutate(id, {
    onSettled: () => {
      actingId.value = null
      banTarget.value = null
    },
  })
}
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
    <PlayerTable
      v-else
      :players="list"
      :busy-id="actingId"
      @kick="onKick"
      @ban="(p) => (banTarget = p)"
    />

    <ConfirmDialog
      :open="banTarget !== null"
      title="Ban this player?"
      :description="`${banTarget?.name ?? 'This player'} will be kicked and banned from the server.`"
      tone="destructive"
      confirm-label="Ban player"
      :loading="ban.isPending.value"
      @update:open="(v) => !v && (banTarget = null)"
      @confirm="confirmBan"
    />
  </section>
</template>
