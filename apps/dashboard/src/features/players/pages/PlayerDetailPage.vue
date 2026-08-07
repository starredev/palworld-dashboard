<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { ArrowLeft, UserX, Ban, Copy, Check, MapPin, Navigation, Circle } from 'lucide-vue-next'
import { Button, ConfirmDialog } from '@tsuki/ui'
import type { PalPlayer } from '@tsuki/types'
import { api } from '@/lib/api'
import { useServerStatus } from '@/composables/use-server'
import { usePlayers } from '@/composables/use-players'
import { useServerCommands } from '@/composables/use-commands'
import { useSaveStatus } from '@/composables/use-save-editor'
import { useAuthStore } from '@/stores/auth'
import PlayerSaveSection from '../components/PlayerSaveSection.vue'
import TeleportDialog from '../components/TeleportDialog.vue'

const route = useRoute()
const router = useRouter()
const uid = computed(() => String(route.params.uid ?? ''))

const auth = useAuthStore()
const status = useServerStatus()
const reachable = computed(() => status.data.value?.reachable === true)
const saveStatus = useSaveStatus()
const canWrite = computed(() => auth.isAdmin && saveStatus.data.value?.canWrite === true)
const saveAvailable = computed(() => auth.isAdmin && saveStatus.data.value?.available === true)

// Live (online) players — has ping, location, userId.
const players = usePlayers(reachable)
const liveList = computed(() => players.data.value?.players ?? [])
const live = computed(() => liveList.value.find((p) => p.playerId === uid.value) ?? null)

// Save roster — resolves offline players (name, level) the live list lacks.
const savePlayers = useQuery({
  queryKey: ['savePlayers'],
  queryFn: () => api.getSavePlayers(),
  enabled: saveAvailable,
  staleTime: 60_000,
})
const saved = computed(
  () => savePlayers.data.value?.players.find((p) => p.uid === uid.value) ?? null,
)

const online = computed(() => live.value !== null)

// Merge live + save into one header model.
const player = computed<PalPlayer | null>(() => {
  if (live.value) return live.value
  if (saved.value) {
    return {
      name: saved.value.name ?? uid.value.slice(0, 8),
      playerId: saved.value.uid,
      userId: null,
      level: saved.value.level,
      ping: null,
      location: null,
    }
  }
  return null
})

const copied = ref('')
function copy(value: string): void {
  void navigator.clipboard?.writeText(value)
  copied.value = value
  setTimeout(() => (copied.value = ''), 1500)
}
function dash(v: string | number | null | undefined): string {
  return v == null || v === '' ? '—' : String(v)
}

// Admin actions.
const { kick, ban } = useServerCommands()
const banConfirm = ref(false)
const teleporting = ref<PalPlayer | null>(null)
const teleportTargets = computed(() => liveList.value.filter((p) => p.playerId !== uid.value))

function onKick(): void {
  const id = player.value?.userId
  if (!id) return
  kick.mutate(id, { onSuccess: () => router.push({ name: 'players' }) })
}
function confirmBan(): void {
  const id = player.value?.userId
  if (!id) return
  ban.mutate(id, {
    onSuccess: () => {
      banConfirm.value = false
      router.push({ name: 'players' })
    },
  })
}
</script>

<template>
  <section class="space-y-6">
    <RouterLink
      :to="{ name: 'players' }"
      class="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft class="size-4" /> Players
    </RouterLink>

    <div
      v-if="!player"
      class="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"
    >
      Player not found. They may be offline and not in the save yet.
    </div>

    <template v-else>
      <!-- Identity header -->
      <header class="rounded-2xl border border-border bg-card p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-center gap-4">
            <span
              class="grid size-14 shrink-0 place-items-center rounded-2xl bg-muted text-xl font-semibold uppercase"
            >
              {{ player.name.charAt(0) }}
            </span>
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <h2 class="text-xl font-semibold tracking-tight">{{ player.name }}</h2>
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  :class="
                    online ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'
                  "
                >
                  <Circle class="size-2 fill-current" /> {{ online ? 'Online' : 'Offline' }}
                </span>
              </div>
              <p class="text-sm text-muted-foreground">
                Level {{ dash(player.level) }}
                <span v-if="player.ping != null"> · {{ Math.round(player.ping) }} ms ping</span>
              </p>
            </div>
          </div>

          <div v-if="auth.isAdmin && online" class="flex flex-wrap gap-2">
            <Button
              v-if="canWrite"
              variant="outline"
              size="sm"
              :disabled="!player.playerId"
              @click="teleporting = player"
            >
              <Navigation /> Teleport
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="!player.userId || kick.isPending.value"
              @click="onKick"
            >
              <UserX /> Kick
            </Button>
            <Button
              variant="destructive"
              size="sm"
              :disabled="!player.userId || ban.isPending.value"
              @click="banConfirm = true"
            >
              <Ban /> Ban
            </Button>
          </div>
        </div>

        <!-- IDs + location -->
        <dl class="mt-6 grid gap-3 border-t border-border pt-5 text-sm sm:grid-cols-3">
          <div
            v-for="row in [
              { label: 'Player ID', value: player.playerId },
              { label: 'User ID (platform)', value: player.userId },
            ]"
            :key="row.label"
            class="space-y-1"
          >
            <dt class="text-xs text-muted-foreground">{{ row.label }}</dt>
            <dd class="flex items-center gap-1.5 font-mono text-xs">
              <span class="truncate">{{ dash(row.value) }}</span>
              <button
                v-if="row.value"
                class="shrink-0 text-muted-foreground hover:text-foreground"
                @click="copy(row.value)"
              >
                <Check v-if="copied === row.value" class="size-3.5 text-emerald-400" />
                <Copy v-else class="size-3.5" />
              </button>
            </dd>
          </div>
          <div class="space-y-1">
            <dt class="text-xs text-muted-foreground">Location</dt>
            <dd class="flex items-center gap-2 text-xs">
              <span class="font-mono">
                {{
                  player.location
                    ? `${Math.round(player.location.x)}, ${Math.round(player.location.y)}`
                    : '—'
                }}
              </span>
              <RouterLink
                v-if="player.location"
                :to="{ name: 'map' }"
                class="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <MapPin class="size-3.5" /> Map
              </RouterLink>
            </dd>
          </div>
        </dl>
      </header>

      <!-- Save data (stats, pals, inventory) -->
      <div v-if="saveAvailable" class="rounded-2xl border border-border bg-card p-6">
        <PlayerSaveSection
          :player="player"
          :can-edit="canWrite"
          auto
          class="!mt-0 !border-t-0 !pt-0"
        />
      </div>
      <p v-else-if="auth.isAdmin" class="text-sm text-muted-foreground">
        Save editing is unavailable — the save directory isn't mounted.
      </p>
    </template>

    <TeleportDialog
      :player="teleporting"
      :others="teleportTargets"
      @close="teleporting = null"
      @done="teleporting = null"
    />

    <ConfirmDialog
      :open="banConfirm"
      title="Ban this player?"
      :description="`${player?.name ?? 'This player'} will be kicked and banned from the server.`"
      tone="destructive"
      confirm-label="Ban player"
      :loading="ban.isPending.value"
      @update:open="(v) => !v && (banConfirm = false)"
      @confirm="confirmBan"
    />
  </section>
</template>
