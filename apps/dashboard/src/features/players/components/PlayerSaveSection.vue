<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Loader2,
  Database,
  Utensils,
  ArrowUpNarrowWide,
  Gauge,
  Sparkles,
  Coins,
} from 'lucide-vue-next'
import { Button, Input } from '@tsuki/ui'
import type { PalPlayer, PalSummary, PlayerStats } from '@tsuki/types'
import { api } from '@/lib/api'
import { useQueueOp } from '@/composables/use-save-batch'
import { usePalIcons } from '../use-pal-icons'
import PalEditDialog from './PalEditDialog.vue'
import PlayerInventory from './PlayerInventory.vue'
import PlayerStatsDialog from './PlayerStatsDialog.vue'

const props = defineProps<{ player: PalPlayer | null; canEdit?: boolean; auto?: boolean }>()

const editingStats = ref(false)
const editingPal = ref<PalSummary | null>(null)
function openPal(pal: PalSummary): void {
  if (props.canEdit && pal.instanceId) editingPal.value = pal
}

const stats = ref<PlayerStats | null>(null)
const loading = ref(false)
const error = ref('')
const levelInput = ref('')

const pal = usePalIcons()
const ELEMENT_COLORS: Record<string, string> = {
  Normal: '#a1a1aa',
  Fire: '#f97316',
  Water: '#38bdf8',
  Leaf: '#4ade80',
  Electric: '#facc15',
  Electricity: '#facc15',
  Ice: '#67e8f9',
  Ground: '#c9a227',
  Dark: '#a78bfa',
  Dragon: '#818cf8',
}
const elemColor = (species: string): string =>
  ELEMENT_COLORS[pal.info(species)?.element ?? 'Normal'] ?? '#71717a'

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
    if (props.auto && props.player?.playerId) void load()
  },
)
onMounted(() => {
  if (props.auto && props.player?.playerId) void load()
})

// Quick actions queue into the shared batch (applied together, one restart).
const queue = useQueueOp()
const name = computed(() => props.player?.name ?? 'player')

function askRefuel(): void {
  const uid = props.player?.playerId
  if (!uid) return
  queue.mutate({ type: 'refuel', uid, label: `Refuel ${name.value}` })
}
function askSetLevel(): void {
  const uid = props.player?.playerId
  const lvl = Number(levelInput.value)
  if (!uid || !Number.isInteger(lvl) || lvl < 1 || lvl > 100) return
  queue.mutate({ type: 'playerLevel', uid, label: `Set ${name.value} to level ${lvl}`, level: lvl })
}

// Gold is the `Money` inventory item — adding it to the inventory raises the total.
const goldInput = ref('10000')
function askGold(): void {
  const uid = props.player?.playerId
  const amount = Math.floor(Number(goldInput.value))
  if (!uid || !Number.isFinite(amount) || amount < 1) return
  queue.mutate({
    type: 'giveItem',
    uid,
    label: `Give ${amount.toLocaleString()} gold to ${name.value}`,
    item: { staticId: 'Money', count: amount },
  })
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
        <div class="mt-4 grid gap-5 lg:grid-cols-3">
          <!-- Stats + quick actions -->
          <div class="space-y-4 lg:col-span-1">
            <dl class="grid grid-cols-2 gap-2 text-center">
              <div v-for="r in rows" :key="r.label" class="rounded-lg bg-muted/40 py-2.5">
                <dt class="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {{ r.label }}
                </dt>
                <dd class="text-sm font-semibold tabular-nums">{{ r.value }}</dd>
              </div>
            </dl>

            <div v-if="canEdit" class="space-y-2">
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  class="flex-1"
                  :disabled="queue.isPending.value"
                  @click="askRefuel"
                >
                  <Utensils /> Refuel
                </Button>
                <Button variant="outline" size="sm" class="flex-1" @click="editingStats = true">
                  <Gauge /> Edit stats
                </Button>
              </div>
              <div class="flex items-center gap-1.5">
                <Input v-model="levelInput" type="number" class="w-full" placeholder="Level" />
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="queue.isPending.value"
                  @click="askSetLevel"
                >
                  <ArrowUpNarrowWide /> Set
                </Button>
              </div>
              <div class="flex items-center gap-1.5">
                <Input
                  v-model="goldInput"
                  type="number"
                  min="1"
                  class="w-full"
                  placeholder="Gold"
                />
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="queue.isPending.value"
                  @click="askGold"
                >
                  <Coins /> Add gold
                </Button>
              </div>
            </div>
          </div>

          <!-- Pals grid -->
          <div class="lg:col-span-2">
            <p class="mb-2 text-xs text-muted-foreground">
              Pals · {{ stats.pals.length }}
              <span v-if="canEdit" class="text-muted-foreground/60">· click to edit</span>
            </p>
            <div
              v-if="stats.pals.length"
              class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4"
            >
              <button
                v-for="(p, i) in stats.pals"
                :key="i"
                type="button"
                class="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 p-2 text-left transition-colors"
                :class="
                  canEdit && p.instanceId
                    ? 'cursor-pointer hover:border-primary/40 hover:bg-muted/50'
                    : 'cursor-default'
                "
                @click="openPal(p)"
              >
                <span
                  class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg"
                  :style="{ backgroundColor: elemColor(p.species) + '22' }"
                >
                  <img
                    v-if="pal.iconUrl(p.species)"
                    :src="pal.iconUrl(p.species)!"
                    :alt="pal.displayName(p.species, p.nickname)"
                    loading="lazy"
                    class="size-9 object-contain"
                    @error="pal.onIconError(p.species)"
                  />
                  <span
                    v-else
                    class="size-3 rounded-full"
                    :style="{ backgroundColor: elemColor(p.species) }"
                  />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-center gap-1 truncate text-xs font-medium">
                    <span v-if="pal.isBoss(p.species)" class="text-amber-400">★</span>
                    <Sparkles v-if="p.lucky" class="size-3 shrink-0 text-yellow-300" />
                    <span class="truncate">{{ pal.displayName(p.species, p.nickname) }}</span>
                  </span>
                  <span class="mt-0.5 block text-[11px] text-muted-foreground">
                    Lv {{ p.level }}
                    <span v-if="p.nickname" class="text-muted-foreground/60">
                      · {{ pal.info(p.species)?.name ?? pal.baseId(p.species) }}
                    </span>
                  </span>
                </span>
              </button>
            </div>
            <p v-else class="text-xs text-muted-foreground">No pals in this player's boxes.</p>
          </div>
        </div>

        <PlayerInventory :uid="player?.playerId ?? null" :can-edit="canEdit" />
      </template>
    </template>

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
