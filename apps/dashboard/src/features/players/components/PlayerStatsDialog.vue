<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { X, TriangleAlert } from 'lucide-vue-next'
import { Button, Input, ConfirmDialog } from '@tsuki/ui'
import type { PlayerStats, PlayerStatsInput } from '@tsuki/types'
import { api } from '@/lib/api'

const props = defineProps<{ stats: PlayerStats | null; uid: string | null; name?: string }>()
const emit = defineEmits<{ close: []; done: [] }>()

const STAT_FIELDS = [
  { k: 'health', l: 'Health' },
  { k: 'stamina', l: 'Stamina' },
  { k: 'attack', l: 'Attack' },
  { k: 'weight', l: 'Weight' },
  { k: 'captureRate', l: 'Capture' },
  { k: 'workSpeed', l: 'Work speed' },
] as const

type Key = 'level' | 'exp' | 'nickName' | (typeof STAT_FIELDS)[number]['k']
const form = ref<Record<Key, string>>({
  level: '',
  exp: '',
  nickName: '',
  health: '',
  stamina: '',
  attack: '',
  weight: '',
  captureRate: '',
  workSpeed: '',
})

watch(
  () => props.stats,
  (s) => {
    const sp = s?.statusPoints
    form.value = {
      level: s?.level != null ? String(s.level) : '',
      exp: s?.exp != null ? String(s.exp) : '',
      nickName: s?.nickName ?? '',
      health: sp?.health != null ? String(sp.health) : '',
      stamina: sp?.stamina != null ? String(sp.stamina) : '',
      attack: sp?.attack != null ? String(sp.attack) : '',
      weight: sp?.weight != null ? String(sp.weight) : '',
      captureRate: sp?.captureRate != null ? String(sp.captureRate) : '',
      workSpeed: sp?.workSpeed != null ? String(sp.workSpeed) : '',
    }
  },
  { immediate: true },
)

const hasPoints = computed(() => !!props.stats?.statusPoints)

function buildInput(): PlayerStatsInput {
  const input: PlayerStatsInput = {}
  const int = (v: string) => (v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined)
  if (int(form.value.level) !== undefined) input.level = int(form.value.level)
  if (int(form.value.exp) !== undefined) input.exp = int(form.value.exp)
  if (form.value.nickName.trim()) input.nickName = form.value.nickName.trim()
  if (hasPoints.value) {
    for (const f of STAT_FIELDS) {
      const v = int(form.value[f.k])
      if (v !== undefined) input[f.k] = v
    }
  }
  return input
}

const confirming = ref(false)
const save = useMutation({
  mutationFn: () => api.editPlayerStats(props.uid!, buildInput()),
  onSuccess: () => {
    confirming.value = false
    emit('done')
    emit('close')
  },
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="stats" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />
        <div
          role="dialog"
          aria-modal="true"
          class="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        >
          <button
            class="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            aria-label="Close"
            @click="emit('close')"
          >
            <X class="size-4" />
          </button>

          <h2 class="text-base font-semibold tracking-tight">
            Edit stats · {{ name ?? 'Player' }}
          </h2>

          <div class="mt-5 grid grid-cols-3 gap-2">
            <label class="block">
              <span class="mb-1 block text-[10px] uppercase text-muted-foreground">Level</span>
              <Input v-model="form.level" type="number" />
            </label>
            <label class="col-span-2 block">
              <span class="mb-1 block text-[10px] uppercase text-muted-foreground">EXP</span>
              <Input v-model="form.exp" type="number" />
            </label>
            <label class="col-span-3 block">
              <span class="mb-1 block text-[10px] uppercase text-muted-foreground">Nickname</span>
              <Input v-model="form.nickName" />
            </label>
          </div>

          <template v-if="hasPoints">
            <p class="mt-4 text-xs font-medium text-muted-foreground">Stat points</p>
            <div class="mt-1.5 grid grid-cols-3 gap-2">
              <label v-for="f in STAT_FIELDS" :key="f.k" class="block">
                <span class="mb-1 block text-[10px] uppercase text-muted-foreground">{{
                  f.l
                }}</span>
                <Input v-model="form[f.k]" type="number" />
              </label>
            </div>
          </template>
          <p v-else class="mt-4 text-xs text-muted-foreground/70">
            No allocated stat points found for this player.
          </p>

          <div
            class="mt-5 flex gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200/90"
          >
            <TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-400" />
            <span>Editing the save stops the server and restarts it. A backup is taken first.</span>
          </div>

          <p v-if="save.isError.value" class="mt-3 text-xs text-red-400">
            {{ (save.error.value as Error)?.message ?? 'Edit failed.' }}
          </p>

          <div class="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm" @click="emit('close')">Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              :disabled="!uid || save.isPending.value"
              @click="confirming = true"
            >
              Apply &amp; restart
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <ConfirmDialog
    :open="confirming"
    title="Edit player stats and restart?"
    :description="`${name ?? 'This player'}'s stats will be updated in the save. The server restarts and everyone disconnects briefly.`"
    tone="destructive"
    confirm-label="Apply & restart"
    :loading="save.isPending.value"
    @update:open="(v: boolean) => !v && (confirming = false)"
    @confirm="save.mutate()"
  />
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
