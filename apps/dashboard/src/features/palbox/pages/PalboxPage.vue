<script setup lang="ts">
import { computed, ref } from 'vue'
import { Loader2, Database, Search, Package, Sparkles } from 'lucide-vue-next'
import { Button, Input } from '@tsuki/ui'
import type { BoxPal } from '@tsuki/types'
import { api } from '@/lib/api'
import { useSaveStatus } from '@/composables/use-save-editor'
import { useAuthStore } from '@/stores/auth'
import { usePalIcons } from '@/features/players/use-pal-icons'
import { workDef } from '@/features/players/work'
import PalEditDialog from '@/features/players/components/PalEditDialog.vue'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'

const auth = useAuthStore()
const saveStatus = useSaveStatus()
const available = computed(() => saveStatus.data.value?.available === true)
const canEdit = computed(() => auth.isAdmin && saveStatus.data.value?.canWrite === true)

// Reading the Palbox decodes the whole Level.sav, so it loads on demand.
const pals = ref<BoxPal[] | null>(null)
const loading = ref(false)
const error = ref('')

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    pals.value = (await api.getSavePals()).pals
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

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

const search = ref('')
const ownerFilter = ref('')
const owners = computed(() => {
  const seen = new Map<string, string>()
  for (const p of pals.value ?? []) {
    if (!seen.has(p.ownerUid)) seen.set(p.ownerUid, p.ownerName ?? p.ownerUid.slice(0, 8))
  }
  return [...seen].map(([uid, name]) => ({ uid, name }))
})

const displayed = computed(() => {
  let list = pals.value ?? []
  if (ownerFilter.value) list = list.filter((p) => p.ownerUid === ownerFilter.value)
  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (p) =>
        pal.displayName(p.species, p.nickname).toLowerCase().includes(q) ||
        p.species.toLowerCase().includes(q) ||
        (p.ownerName ?? '').toLowerCase().includes(q),
    )
  }
  return list
})

const editing = ref<BoxPal | null>(null)
function openPal(p: BoxPal): void {
  if (canEdit.value && p.instanceId) editing.value = p
}
const workTotal = (rank: number, add: number): number => Math.min(5, rank + add)
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div class="space-y-1">
        <h2 class="text-xl font-semibold tracking-tight">Palbox</h2>
        <p class="text-sm text-muted-foreground">
          Every pal in the save, across all players — stats, passives and work suitability.
          <span v-if="canEdit" class="text-muted-foreground/60">Click a pal to edit.</span>
        </p>
      </div>
      <div v-if="pals" class="flex flex-wrap items-center gap-2">
        <select
          v-model="ownerFilter"
          class="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All players</option>
          <option v-for="o in owners" :key="o.uid" :value="o.uid">{{ o.name }}</option>
        </select>
        <div class="relative">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input v-model="search" placeholder="Search pals…" class="w-56 pl-9" />
        </div>
      </div>
    </header>

    <PagePlaceholder
      v-if="saveStatus.data.value && !available"
      :icon="Package"
      title="Palbox unavailable"
      description="Save reading needs the converter and the save directory mounted in the API container."
    />

    <div v-else-if="!pals" class="rounded-xl border border-dashed border-border p-10 text-center">
      <Package class="mx-auto size-8 text-muted-foreground/60" />
      <p class="mt-3 text-sm text-muted-foreground">
        Reading the Palbox decodes the whole Level.sav, so it loads on demand.
      </p>
      <Button class="mt-4" :disabled="loading" @click="load">
        <Loader2 v-if="loading" class="animate-spin" />
        <Database v-else />
        {{ loading ? 'Reading Level.sav…' : 'Load Palbox' }}
      </Button>
      <p v-if="error" class="mt-3 text-xs text-amber-400">{{ error }}</p>
    </div>

    <template v-else>
      <p class="text-xs text-muted-foreground">
        {{ displayed.length }} of {{ pals.length }} pals
        <button class="ml-2 text-primary hover:underline" :disabled="loading" @click="load">
          {{ loading ? 'Reloading…' : 'Reload' }}
        </button>
      </p>
      <p v-if="error" class="text-xs text-amber-400">{{ error }}</p>

      <PagePlaceholder
        v-if="displayed.length === 0"
        :icon="Search"
        title="No matches"
        description="No pals match the current filter."
      />

      <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button
          v-for="(p, i) in displayed"
          :key="p.instanceId ?? i"
          type="button"
          class="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-2.5 text-left transition-colors"
          :class="
            canEdit && p.instanceId
              ? 'cursor-pointer hover:border-primary/40 hover:bg-muted/50'
              : 'cursor-default'
          "
          @click="openPal(p)"
        >
          <span class="flex items-center gap-2.5">
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
              <span class="mt-0.5 block truncate text-[11px] text-muted-foreground">
                Lv {{ p.level }}
                <span v-if="p.stars" class="text-amber-400">· {{ p.stars }}★</span>
                · {{ p.ownerName ?? p.ownerUid.slice(0, 8) }}
              </span>
            </span>
          </span>
          <span v-if="p.workSuitabilities.length" class="flex flex-wrap gap-1">
            <span
              v-for="w in p.workSuitabilities"
              :key="w.type"
              class="inline-flex items-center gap-0.5 rounded bg-muted/50 px-1 py-0.5 text-[10px]"
              :title="`${workDef(w.type)?.name ?? w.type} Lv ${workTotal(w.rank, w.add)}`"
            >
              {{ workDef(w.type)?.icon ?? '•' }}
              <span class="tabular-nums" :class="w.add ? 'font-semibold text-primary' : ''">
                {{ workTotal(w.rank, w.add) }}
              </span>
            </span>
          </span>
        </button>
      </div>
    </template>

    <PalEditDialog
      :pal="editing"
      :uid="editing?.ownerUid ?? null"
      @close="editing = null"
      @done="load"
    />
  </section>
</template>
