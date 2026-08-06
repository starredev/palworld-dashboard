<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { Loader2, Database, Utensils, ArrowUpNarrowWide, Gauge } from 'lucide-vue-next'
import { Button, Input, ConfirmDialog } from '@tsuki/ui'
import type { PalPlayer, PalSummary, PlayerStats } from '@tsuki/types'
import { api } from '@/lib/api'
import PalEditDialog from './PalEditDialog.vue'
import PlayerInventory from './PlayerInventory.vue'
import PlayerStatsDialog from './PlayerStatsDialog.vue'

const editingStats = ref(false)

const props = defineProps<{ player: PalPlayer | null; canEdit?: boolean }>()

const editingPal = ref<PalSummary | null>(null)
function openPal(pal: PalSummary): void {
  if (props.canEdit && pal.instanceId) editingPal.value = pal
}

const stats = ref<PlayerStats | null>(null)
const loading = ref(false)
const error = ref('')
const levelInput = ref('')

// Reading Level.sav is heavy (decodes the whole file), so load on demand.
async function load(): Promise<void> {
  if (!props.player?.playerId) {
    error.value = 'This player has no id in the save.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    stats.value = await api.getPlayerStats(props.player.playerId)
    levelInput.value = stats.value.level != null ? String(stats.value.level) : ''
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

watch(
  () => props.player,
  () => {
    stats.value = null
    error.value = ''
    levelInput.value = ''
  },
)

// One confirm dialog drives both writes (each restarts the server).
type Pending = { label: string; run: () => Promise<unknown> } | null
const pending = ref<Pending>(null)

const write = useMutation({
  mutationFn: () => pending.value!.run(),
  onSuccess: async () => {
    pending.value = null
    await load()
  },
})

function askRefuel(): void {
  const uid = props.player?.playerId
  if (!uid) return
  pending.value = { label: 'restore hunger & sanity', run: () => api.refuelPlayer(uid) }
}
function askSetLevel(): void {
  const uid = props.player?.playerId
  const lvl = Number(levelInput.value)
  if (!uid || !Number.isInteger(lvl) || lvl < 1 || lvl > 100) return
  pending.value = { label: `set level to ${lvl}`, run: () => api.setPlayerLevel(uid, lvl) }
}

const rows = computed(() => {
  const s = stats.value
  if (!s?.found) return []
  return [
    { label: 'Level', value: s.level ?? '—' },
    { label: 'EXP', value: s.exp != null ? s.exp.toLocaleString() : '—' },
    { label: 'Hunger', value: s.hunger != null ? Math.round(s.hunger) : '—' },
    { label: 'Sanity', value: s.sanity != null ? Math.round(s.sanity) : '—' },
  ]
})
</script>

<template>
  <div class="mt-6 border-t border-border pt-5">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium">Save data</h3>
      <Button v-if="!stats && !loading" variant="outline" size="sm" @click="load">
        <Database /> Load stats &amp; pals
      </Button>
    </div>

    <p v-if="loading" class="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 class="size-3.5 animate-spin" /> Reading Level.sav…
    </p>
    <p v-else-if="error" class="mt-3 text-xs text-amber-400">{{ error }}</p>

    <template v-else-if="stats">
      <p v-if="!stats.found" class="mt-3 text-xs text-muted-foreground">
        No save record for this player yet.
      </p>
      <template v-else>
        <dl class="mt-4 grid grid-cols-4 gap-2 text-center">
          <div v-for="r in rows" :key="r.label" class="rounded-lg bg-muted/40 py-2">
            <dt class="text-[10px] uppercase tracking-wide text-muted-foreground">{{ r.label }}</dt>
            <dd class="text-sm font-semibold tabular-nums">{{ r.value }}</dd>
          </div>
        </dl>

        <!-- Pals -->
        <div class="mt-4">
          <p class="mb-1.5 text-xs text-muted-foreground">
            Pals · {{ stats.pals.length }}
            <span v-if="canEdit" class="text-muted-foreground/60">· click to edit</span>
          </p>
          <div class="max-h-40 space-y-1 overflow-y-auto pr-1">
            <div
              v-for="(pal, i) in stats.pals"
              :key="i"
              class="flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1.5 text-xs"
              :class="canEdit && pal.instanceId ? 'cursor-pointer hover:bg-muted/60' : ''"
              @click="openPal(pal)"
            >
              <span class="truncate">
                <span v-if="pal.species.startsWith('BOSS_')" class="mr-1 text-amber-400">★</span>
                {{ pal.nickname ?? pal.species.replace('BOSS_', '') }}
              </span>
              <span class="shrink-0 text-muted-foreground">Lv {{ pal.level }}</span>
            </div>
          </div>
        </div>

        <PlayerInventory :uid="player?.playerId ?? null" />

        <!-- Quick actions (admin) -->
        <div v-if="canEdit" class="mt-5 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" :disabled="write.isPending.value" @click="askRefuel">
            <Utensils /> Refuel
          </Button>
          <Button variant="outline" size="sm" @click="editingStats = true">
            <Gauge /> Edit stats
          </Button>
          <div class="flex items-center gap-1.5">
            <Input v-model="levelInput" type="number" class="w-20" placeholder="Lvl" />
            <Button
              variant="outline"
              size="sm"
              :disabled="write.isPending.value"
              @click="askSetLevel"
            >
              <ArrowUpNarrowWide /> Set level
            </Button>
          </div>
        </div>
      </template>
    </template>

    <ConfirmDialog
      :open="pending !== null"
      title="Edit save and restart?"
      :description="`This will ${pending?.label ?? 'edit the save'} for ${player?.name ?? 'this player'}. The server restarts and everyone disconnects briefly. A backup is taken first.`"
      tone="destructive"
      confirm-label="Apply & restart"
      :loading="write.isPending.value"
      @update:open="(v: boolean) => !v && (pending = null)"
      @confirm="write.mutate()"
    />

    <PalEditDialog
      :pal="editingPal"
      :uid="player?.playerId ?? null"
      @close="editingPal = null"
      @done="load"
    />

    <PlayerStatsDialog
      :stats="editingStats ? stats : null"
      :uid="player?.playerId ?? null"
      :name="player?.name"
      @close="editingStats = false"
      @done="load"
    />
  </div>
</template>
