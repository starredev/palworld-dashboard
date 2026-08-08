<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { Loader2, Tent, MapPin, Check, Ruler } from 'lucide-vue-next'
import { Button, Input } from '@tsuki/ui'
import type { BaseCamp } from '@tsuki/types'
import { api } from '@/lib/api'
import { useSaveStatus } from '@/composables/use-save-editor'
import { useAuthStore } from '@/stores/auth'
import { useQueueOp } from '@/composables/use-save-batch'

const auth = useAuthStore()
const saveStatus = useSaveStatus()
const available = computed(() => saveStatus.data.value?.available === true)
const canWrite = computed(() => auth.isAdmin && saveStatus.data.value?.canWrite === true)

const bases = useQuery({
  queryKey: ['saveBases'],
  queryFn: () => api.getBases(),
  enabled: available,
  staleTime: 60_000,
})

// Default build radius is 3500 cm = 35 m; presets in metres.
const PRESETS = [35, 50, 70, 100]
const metres = (areaRange: number) => Math.round(areaRange / 100)

// Group bases by guild, each labelled "Base N" in stored order within the guild.
const groups = computed(() => {
  const list = bases.data.value?.bases ?? []
  const byGuild = new Map<string, { name: string; items: { base: BaseCamp; index: number }[] }>()
  for (const base of list) {
    const key = base.guildId ?? 'none'
    if (!byGuild.has(key)) byGuild.set(key, { name: base.guildName ?? 'Unaffiliated', items: [] })
    const g = byGuild.get(key)!
    g.items.push({ base, index: g.items.length + 1 })
  }
  return [...byGuild.values()].sort((a, b) => a.name.localeCompare(b.name))
})

const queue = useQueueOp()
const queued = ref<Map<string, number>>(new Map()) // baseId -> queued metres
const custom = ref<Record<string, string>>({})

function setSize(base: BaseCamp, label: string, m: number): void {
  const clamped = Math.min(1000, Math.max(5, Math.round(m)))
  queue.mutate(
    {
      type: 'baseArea',
      baseId: base.id,
      areaRange: clamped * 100,
      label: `Set ${label} size to ${clamped} m`,
    },
    { onSuccess: () => (queued.value = new Map(queued.value).set(base.id, clamped)) },
  )
}
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <Tent class="size-5" /> Bases
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Every base camp in the save, grouped by guild. Admins can resize the build area.
      </p>
    </header>

    <p
      v-if="!available"
      class="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"
    >
      Save reading is unavailable — the save directory isn't mounted.
    </p>

    <p
      v-else-if="bases.isPending.value"
      class="flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      <Loader2 class="size-4 animate-spin" /> Reading Level.sav…
    </p>
    <p v-else-if="bases.isError.value" class="text-sm text-amber-400">
      {{ (bases.error.value as Error)?.message ?? 'Failed to read bases.' }}
    </p>

    <template v-else>
      <p
        v-if="!groups.length"
        class="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"
      >
        No base camps found in the save.
      </p>

      <div v-for="g in groups" :key="g.name" class="space-y-3">
        <h2 class="text-sm font-medium text-muted-foreground">
          {{ g.name }} · {{ g.items.length }} base{{ g.items.length === 1 ? '' : 's' }}
        </h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="{ base, index } in g.items"
            :key="base.id"
            class="rounded-2xl border border-border bg-card p-4"
          >
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-1.5 text-sm font-medium">
                <Tent class="size-4 text-muted-foreground" /> Base {{ index }}
              </span>
              <RouterLink
                :to="{ name: 'map' }"
                class="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                <MapPin class="size-3.5" />
                {{ Math.round(base.location.x) }}, {{ Math.round(base.location.y) }}
              </RouterLink>
            </div>

            <p class="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Ruler class="size-3.5" /> Build radius
              <span class="font-semibold text-foreground">{{ metres(base.areaRange) }} m</span>
              <span
                v-if="queued.get(base.id)"
                class="inline-flex items-center gap-1 text-emerald-400"
              >
                <Check class="size-3.5" /> queued → {{ queued.get(base.id) }} m
              </span>
            </p>

            <div v-if="canWrite" class="mt-3 flex flex-wrap items-center gap-1.5">
              <Button
                v-for="p in PRESETS"
                :key="p"
                variant="outline"
                size="sm"
                :disabled="queue.isPending.value"
                @click="setSize(base, `Base ${index}`, p)"
              >
                {{ p }} m
              </Button>
              <span class="mx-0.5 h-4 w-px bg-border" />
              <Input
                v-model="custom[base.id]"
                type="number"
                min="5"
                max="1000"
                placeholder="m"
                class="w-20"
              />
              <Button
                variant="outline"
                size="sm"
                :disabled="queue.isPending.value || !Number(custom[base.id])"
                @click="setSize(base, `Base ${index}`, Number(custom[base.id]))"
              >
                Set
              </Button>
            </div>
          </div>
        </div>
      </div>

      <p v-if="canWrite && groups.length" class="text-[11px] text-muted-foreground/70">
        Resizing queues into the batch (one server restart on Apply). Default is 35 m. The save
        stores the value; whether the game applies a larger radius is best confirmed in-game.
      </p>
    </template>
  </section>
</template>
