<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { Users, PlugZap, ServerOff, Search } from 'lucide-vue-next'
import type { PalPlayer } from '@tsuki/types'
import { Skeleton, ConfirmDialog, Input } from '@tsuki/ui'
import { api } from '@/lib/api'
import { useServerStatus } from '@/composables/use-server'
import { usePlayers } from '@/composables/use-players'
import { useServerCommands } from '@/composables/use-commands'
import { useSaveStatus } from '@/composables/use-save-editor'
import { useAuthStore } from '@/stores/auth'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'
import PlayerTable, { type SortKey } from '../components/PlayerTable.vue'
import OfflinePlayersTable from '../components/OfflinePlayersTable.vue'

const router = useRouter()
function openPlayer(uid: string | null): void {
  if (uid) void router.push({ name: 'player', params: { uid } })
}

const status = useServerStatus()
const statusData = computed(() => status.data.value)
const reachable = computed(() => statusData.value?.reachable === true)
const notConfigured = computed(() => statusData.value && !statusData.value.configured)
const offline = computed(() => statusData.value?.configured && !statusData.value.reachable)

const players = usePlayers(reachable)
const list = computed(() => players.data.value?.players ?? [])
const loading = computed(() => reachable.value && players.isLoading.value)

const search = ref('')
const sortKey = ref<SortKey>('name')
const sortDir = ref<'asc' | 'desc'>('asc')

function onSort(key: SortKey): void {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function compare(a: PalPlayer, b: PalPlayer): number {
  const key = sortKey.value
  if (key === 'name') return a.name.localeCompare(b.name)
  const av = a[key] ?? -1
  const bv = b[key] ?? -1
  return av - bv
}

const displayed = computed(() => {
  const q = search.value.trim().toLowerCase()
  const filtered = q
    ? list.value.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.userId ?? '').toLowerCase().includes(q) ||
          (p.playerId ?? '').toLowerCase().includes(q),
      )
    : list.value
  const sorted = [...filtered].sort(compare)
  return sortDir.value === 'desc' ? sorted.reverse() : sorted
})

// Full roster (incl. offline players + last seen) from the live-map GameData.
const roster = useQuery({
  queryKey: ['playersRoster'],
  queryFn: () => api.getPlayerRoster(),
  refetchInterval: 15_000,
})
const offlinePlayers = computed(() => (roster.data.value?.players ?? []).filter((p) => !p.online))

const auth = useAuthStore()
const saveStatus = useSaveStatus()
const saveAvailable = computed(() => auth.isAdmin && saveStatus.data.value?.available === true)

// All players straight from the save (online or not) → gives offline players the
// save uid the live roster lacks, so the inspector/edits can target them too.
const savePlayers = useQuery({
  queryKey: ['savePlayers'],
  queryFn: () => api.getSavePlayers(),
  enabled: saveAvailable,
  staleTime: 60_000,
})
function openFromRoster(rp: { name: string; level: number | null }): void {
  const match = savePlayers.data.value?.players.find((p) => p.name === rp.name)
  openPlayer(match?.uid ?? null)
}

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
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div class="space-y-1">
        <h2 class="text-xl font-semibold tracking-tight">Players</h2>
        <p class="text-sm text-muted-foreground">
          {{ reachable ? `${list.length} online` : 'Online players on your server'
          }}{{ offlinePlayers.length ? ` · ${offlinePlayers.length} offline` : '' }}
        </p>
      </div>
      <div v-if="reachable && list.length" class="relative">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input v-model="search" placeholder="Search players…" class="w-56 pl-9" />
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
    <PagePlaceholder
      v-else-if="displayed.length === 0"
      :icon="Search"
      title="No matches"
      :description="`No players match '${search}'.`"
    />
    <PlayerTable
      v-else
      :players="displayed"
      :busy-id="actingId"
      :sort-key="sortKey"
      :sort-dir="sortDir"
      @kick="onKick"
      @ban="(p) => (banTarget = p)"
      @sort="onSort"
      @select="(p) => openPlayer(p.playerId)"
    />

    <div v-if="offlinePlayers.length" class="space-y-3">
      <h3 class="text-sm font-medium text-muted-foreground">
        Offline · {{ offlinePlayers.length }}
      </h3>
      <OfflinePlayersTable
        :players="offlinePlayers"
        :can-open="saveAvailable"
        @select="openFromRoster"
      />
    </div>

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
