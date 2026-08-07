<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X, HeartPulse, Copy, Layers, Plus } from 'lucide-vue-next'
import { Button, Input } from '@tsuki/ui'
import type { PalSummary } from '@tsuki/types'
import { useQueueOp } from '@/composables/use-save-batch'
import { PASSIVES, passiveName, passiveDef, KIND_COLOR } from '../passives'

const props = defineProps<{ pal: PalSummary | null; uid: string | null }>()
const emit = defineEmits<{ close: []; done: [] }>()

const done = () => (emit('done'), emit('close'))

const form = ref({ level: '', hp: '', shot: '', defense: '', heal: false })
// Selected passive ids (prefilled from the pal; unknown ids are preserved).
const passives = ref<string[]>([])
const addPick = ref('')

watch(
  () => props.pal,
  (p) => {
    form.value = {
      level: p?.level != null ? String(p.level) : '',
      hp: p?.talentHp != null ? String(p.talentHp) : '0',
      shot: p?.talentShot != null ? String(p.talentShot) : '0',
      defense: p?.talentDefense != null ? String(p.talentDefense) : '0',
      heal: false,
    }
    passives.value = [...(p?.passives ?? [])]
    addPick.value = ''
  },
  { immediate: true },
)

// Dataset options not already on the pal (dedupe against current selection).
const addable = computed(() => PASSIVES.filter((d) => !passives.value.includes(d.id)))
function addPassive(id: string): void {
  if (id && passives.value.length < 4 && !passives.value.includes(id)) passives.value.push(id)
  addPick.value = ''
}
function removePassive(id: string): void {
  passives.value = passives.value.filter((p) => p !== id)
}
const passivesChanged = computed(() => {
  const a = [...(props.pal?.passives ?? [])].sort()
  const b = [...passives.value].sort()
  return a.length !== b.length || a.some((x, i) => x !== b[i])
})
const kindColor = (id: string) => KIND_COLOR[passiveDef(id)?.kind ?? 'utility']

const title = computed(
  () => props.pal?.nickname || props.pal?.species.replace('BOSS_', '') || 'Pal',
)
const num = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

const canApply = computed(() => !!props.pal?.instanceId && !!props.uid)
const queue = useQueueOp()

function queueEdit(): void {
  queue.mutate(
    {
      type: 'palEdit',
      uid: props.uid!,
      instanceId: props.pal!.instanceId!,
      label: `Edit pal ${title.value}`,
      input: {
        level: num(form.value.level),
        talentHp: num(form.value.hp),
        talentShot: num(form.value.shot),
        talentDefense: num(form.value.defense),
        ...(form.value.heal ? { heal: true } : {}),
        ...(passivesChanged.value ? { passives: passives.value } : {}),
      },
    },
    { onSuccess: done },
  )
}
function queueClone(): void {
  queue.mutate(
    {
      type: 'palClone',
      uid: props.uid!,
      instanceId: props.pal!.instanceId!,
      label: `Duplicate pal ${title.value}`,
    },
    { onSuccess: done },
  )
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="pal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />
        <div
          role="dialog"
          aria-modal="true"
          class="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
        >
          <button
            class="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            aria-label="Close"
            @click="emit('close')"
          >
            <X class="size-4" />
          </button>

          <h2 class="text-base font-semibold tracking-tight">Edit {{ title }}</h2>
          <p class="mt-1 text-xs text-muted-foreground">{{ pal.species.replace('BOSS_', '') }}</p>

          <label class="mt-5 block text-xs font-medium text-muted-foreground">Level</label>
          <Input v-model="form.level" type="number" class="mt-1.5 w-28" placeholder="Level" />

          <p class="mt-4 text-xs font-medium text-muted-foreground">IVs / Talents (0–100)</p>
          <div class="mt-1.5 grid grid-cols-3 gap-2">
            <label
              v-for="f in [
                { k: 'hp', l: 'HP' },
                { k: 'shot', l: 'Shot' },
                { k: 'defense', l: 'Def' },
              ]"
              :key="f.k"
            >
              <span class="mb-1 block text-[10px] uppercase text-muted-foreground">{{ f.l }}</span>
              <Input v-model="form[f.k as 'hp' | 'shot' | 'defense']" type="number" />
            </label>
          </div>

          <!-- Passive skills (speed passives also boost mount/fly speed) -->
          <div class="mt-4">
            <p class="text-xs font-medium text-muted-foreground">
              Passives · {{ passives.length }}/4
            </p>
            <div v-if="passives.length" class="mt-1.5 flex flex-wrap gap-1.5">
              <span
                v-for="id in passives"
                :key="id"
                class="inline-flex items-center gap-1.5 rounded-md bg-muted/60 py-1 pl-2 pr-1 text-xs"
              >
                <span class="size-1.5 rounded-full" :style="{ backgroundColor: kindColor(id) }" />
                <span :title="passiveDef(id)?.effect ?? id">{{ passiveName(id) }}</span>
                <button
                  class="text-muted-foreground hover:text-foreground"
                  aria-label="Remove"
                  @click="removePassive(id)"
                >
                  <X class="size-3" />
                </button>
              </span>
            </div>
            <div v-if="passives.length < 4" class="mt-1.5 flex items-center gap-1.5">
              <select
                v-model="addPick"
                class="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Add a passive…</option>
                <option v-for="d in addable" :key="d.id" :value="d.id">
                  {{ d.name }} — {{ d.effect }}
                </option>
              </select>
              <Button variant="outline" size="sm" :disabled="!addPick" @click="addPassive(addPick)">
                <Plus />
              </Button>
            </div>
          </div>

          <label class="mt-4 flex cursor-pointer items-center gap-2 text-sm">
            <input v-model="form.heal" type="checkbox" class="size-4 accent-emerald-400" />
            <HeartPulse class="size-4 text-emerald-400" /> Fully heal (HP, hunger, cure sickness)
          </label>

          <p v-if="queue.isError.value" class="mt-4 text-xs text-red-400">
            {{ (queue.error.value as Error)?.message ?? 'Failed to queue.' }}
          </p>

          <div class="mt-6 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="!canApply || queue.isPending.value"
              @click="queueClone"
            >
              <Copy /> Duplicate
            </Button>
            <div class="flex gap-2">
              <Button variant="outline" size="sm" @click="emit('close')">Cancel</Button>
              <Button size="sm" :disabled="!canApply || queue.isPending.value" @click="queueEdit">
                <Layers /> Add to batch
              </Button>
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
