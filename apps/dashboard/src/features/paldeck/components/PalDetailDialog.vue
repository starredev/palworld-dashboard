<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { X, Users, MapPin } from 'lucide-vue-next'

export interface PalEntry {
  dex: number
  id: string
  name: string
  elements: string[]
  rarity: number
  size: string
  hp: number | null
  atk: number | null
  def: number | null
  work: { k: string; lv: number }[]
  desc: string
}

defineProps<{ pal: PalEntry | null; owners: string[] }>()
const emit = defineEmits<{ close: [] }>()

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
const elemColor = (e?: string) => (e && ELEMENT_COLORS[e]) || '#71717a'
const icon = (id: string) => `https://palworld.gg/images/full_palicon/T_${id}_icon_normal.png`

const WORK_ICONS: Record<string, string> = {
  Handiwork: '🔨',
  Gathering: '🧺',
  Lumbering: '🪓',
  Mining: '⛏️',
  Kindling: '🔥',
  Watering: '💧',
  Planting: '🌱',
  'Generating Electricity': '⚡',
  Cooling: '❄️',
  'Medicine Production': '💊',
  Transporting: '📦',
  Farming: '🌾',
}
// Work level tint: 1 grey → 4 purple.
const LV_COLORS = ['#71717a', '#a1a1aa', '#38bdf8', '#f59e0b', '#a78bfa']
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="pal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />
        <div
          role="dialog"
          aria-modal="true"
          class="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
        >
          <button
            class="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            aria-label="Close"
            @click="emit('close')"
          >
            <X class="size-4" />
          </button>

          <div class="flex items-center gap-4">
            <img
              :src="icon(pal.id)"
              :alt="pal.name"
              class="size-16 shrink-0 object-contain"
              onerror="this.style.visibility = 'hidden'"
            />
            <div>
              <p class="text-xs text-muted-foreground">#{{ pal.dex }}</p>
              <h2 class="text-lg font-semibold tracking-tight">{{ pal.name }}</h2>
              <div class="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  v-for="e in pal.elements"
                  :key="e"
                  class="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  :style="{ backgroundColor: elemColor(e) + '22', color: elemColor(e) }"
                >
                  {{ e }}
                </span>
                <span v-if="pal.rarity" class="text-[10px] text-amber-400">
                  {{ '★'.repeat(Math.min(5, Math.ceil(pal.rarity / 2))) }}
                </span>
              </div>
            </div>
          </div>

          <p v-if="pal.desc" class="mt-4 text-xs leading-relaxed text-muted-foreground">
            {{ pal.desc }}
          </p>

          <RouterLink
            :to="{ path: '/map', query: { species: pal.id } }"
            class="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <MapPin class="size-3.5" /> Show where they are on the map
          </RouterLink>

          <!-- Base stats -->
          <dl class="mt-4 grid grid-cols-3 gap-2 text-center">
            <div
              v-for="s in [
                { l: 'HP', v: pal.hp },
                { l: 'Attack', v: pal.atk },
                { l: 'Defense', v: pal.def },
              ]"
              :key="s.l"
              class="rounded-lg bg-muted/40 py-2"
            >
              <dt class="text-[10px] uppercase tracking-wide text-muted-foreground">{{ s.l }}</dt>
              <dd class="text-sm font-semibold tabular-nums">{{ s.v ?? '—' }}</dd>
            </div>
          </dl>

          <!-- Work suitability (crafting = Handiwork) -->
          <div v-if="pal.work.length" class="mt-4">
            <p class="mb-1.5 text-xs text-muted-foreground">Work suitability</p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="w in pal.work"
                :key="w.k"
                class="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-xs"
              >
                <span>{{ WORK_ICONS[w.k] ?? '•' }}</span>
                {{ w.k }}
                <span
                  class="grid size-4 place-items-center rounded-full text-[10px] font-bold text-black"
                  :style="{ backgroundColor: LV_COLORS[w.lv] ?? '#71717a' }"
                >
                  {{ w.lv }}
                </span>
              </span>
            </div>
          </div>

          <!-- Owners on this server -->
          <div class="mt-5 border-t border-border pt-4">
            <p class="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users class="size-3.5" /> Owned on this server · {{ owners.length }}
            </p>
            <p v-if="!owners.length" class="text-xs text-muted-foreground">
              No one has this pal yet.
            </p>
            <div v-else class="flex flex-wrap gap-1.5">
              <span
                v-for="(name, i) in owners"
                :key="i"
                class="rounded-full bg-muted/50 px-2.5 py-1 text-xs"
              >
                {{ name }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
</style>
