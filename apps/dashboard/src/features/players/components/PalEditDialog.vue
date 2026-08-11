<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { X, HeartPulse, Copy, Layers, Plus, Send, Star } from 'lucide-vue-next'
import { Button, Input } from '@tsuki/ui'
import type { PalSummary } from '@tsuki/types'
import { api } from '@/lib/api'
import { useQueueOp } from '@/composables/use-save-batch'
import { PASSIVES, passiveName, passiveDef, KIND_COLOR } from '../passives'
import { WORK_TYPES } from '../work'

const props = defineProps<{ pal: PalSummary | null; uid: string | null }>()
const emit = defineEmits<{ close: []; done: [] }>()

const done = () => (emit('done'), emit('close'))

const form = ref({ level: '', stars: 0, hp: '', shot: '', defense: '', heal: false })
// Selected passive ids (prefilled from the pal; unknown ids are preserved).
const passives = ref<string[]>([])
const addPick = ref('')
// Work suitability totals (base species rank + condenser bonus), editable 0–5.
// The base rank is a floor: the backend only writes the bonus above it.
const work = ref<Record<string, number>>({})
const workBase = ref<Record<string, number>>({})
const workPick = ref('')

watch(
  () => props.pal,
  (p) => {
    form.value = {
      level: p?.level != null ? String(p.level) : '',
      stars: p?.stars ?? 0,
      hp: p?.talentHp != null ? String(p.talentHp) : '0',
      shot: p?.talentShot != null ? String(p.talentShot) : '0',
      defense: p?.talentDefense != null ? String(p.talentDefense) : '0',
      heal: false,
    }
    passives.value = [...(p?.passives ?? [])]
    addPick.value = ''
    const totals: Record<string, number> = {}
    const bases: Record<string, number> = {}
    for (const s of p?.workSuitabilities ?? []) {
      bases[s.type] = s.rank
      totals[s.type] = Math.min(5, s.rank + s.add)
    }
    work.value = totals
    workBase.value = bases
    workPick.value = ''
  },
  { immediate: true },
)

const hasWork = (key: string) => (work.value[key] ?? 0) > 0 || (workBase.value[key] ?? 0) > 0
const workRows = computed(() => WORK_TYPES.filter((t) => hasWork(t.key)))
const workAddable = computed(() => WORK_TYPES.filter((t) => !hasWork(t.key)))

function setWork(key: string, n: number): void {
  // Clicking the current level drops one; never below the species base.
  const next = Math.max(workBase.value[key] ?? 0, (work.value[key] ?? 0) === n ? n - 1 : n)
  work.value = { ...work.value, [key]: next }
}
function addWork(key: string): void {
  if (!key) return
  work.value = { ...work.value, [key]: 1 }
  workPick.value = ''
}
function workPipClass(key: string, n: number): string {
  if (n <= (workBase.value[key] ?? 0)) return 'bg-muted-foreground/60'
  if (n <= (work.value[key] ?? 0)) return 'bg-primary'
  return 'bg-muted-foreground/20 hover:bg-primary/50'
}
// Only the keys whose total actually changed are sent.
const workChanged = computed<Record<string, number>>(() => {
  const orig: Record<string, number> = {}
  for (const s of props.pal?.workSuitabilities ?? []) orig[s.type] = Math.min(5, s.rank + s.add)
  const changed: Record<string, number> = {}
  for (const [k, v] of Object.entries(work.value)) if ((orig[k] ?? 0) !== v) changed[k] = v
  return changed
})

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

// Condensation stars 0–4. Clicking a filled star at its own position drops one.
const starsChanged = computed(() => form.value.stars !== (props.pal?.stars ?? 0))
function setStars(n: number): void {
  form.value.stars = form.value.stars === n ? n - 1 : n
}

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
        ...(starsChanged.value ? { stars: form.value.stars } : {}),
        ...(form.value.heal ? { heal: true } : {}),
        ...(passivesChanged.value ? { passives: passives.value } : {}),
        ...(Object.keys(workChanged.value).length ? { workSuitability: workChanged.value } : {}),
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

// Copy this pal into another player's Pal Box.
const copyTarget = ref('')
watch(
  () => props.pal,
  () => (copyTarget.value = ''),
)
const savePlayers = useQuery({
  queryKey: ['savePlayers'],
  queryFn: () => api.getSavePlayers(),
  staleTime: 60_000,
})
const copyTargets = computed(() =>
  (savePlayers.data.value?.players ?? []).filter((p) => p.uid !== props.uid),
)
function queueCopy(): void {
  const to = copyTargets.value.find((p) => p.uid === copyTarget.value)
  if (!to || !props.uid || !props.pal?.instanceId) return
  queue.mutate(
    {
      type: 'palCopy',
      fromUid: props.uid,
      toUid: to.uid,
      instanceId: props.pal.instanceId,
      label: `Copy ${title.value} → ${to.name ?? to.uid.slice(0, 8)}`,
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
          class="relative z-10 max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
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

          <div class="mt-5 flex items-end gap-6">
            <div>
              <label class="block text-xs font-medium text-muted-foreground">Level</label>
              <Input v-model="form.level" type="number" class="mt-1.5 w-28" placeholder="Level" />
            </div>
            <div>
              <span class="block text-xs font-medium text-muted-foreground"
                >Stars ({{ form.stars }}/4)</span
              >
              <div class="mt-1.5 flex items-center gap-0.5">
                <button
                  v-for="n in 4"
                  :key="n"
                  type="button"
                  :aria-label="`${n} star${n === 1 ? '' : 's'}`"
                  :title="`${n}★`"
                  @click="setStars(n)"
                >
                  <Star
                    class="size-6 transition-colors"
                    :class="
                      n <= form.stars
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/40 hover:text-amber-300'
                    "
                  />
                </button>
              </div>
            </div>
          </div>

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

          <!-- Work suitability (crafting = Handiwork). Base levels are a floor. -->
          <div class="mt-4">
            <p class="text-xs font-medium text-muted-foreground">Work suitability</p>
            <div v-if="workRows.length" class="mt-1.5 space-y-1">
              <div
                v-for="t in workRows"
                :key="t.key"
                class="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1"
              >
                <span class="flex min-w-0 items-center gap-1.5 text-xs">
                  <span>{{ t.icon }}</span>
                  <span class="truncate">{{ t.name }}</span>
                </span>
                <span class="flex items-center gap-1">
                  <span class="flex items-center gap-0.5">
                    <button
                      v-for="n in 5"
                      :key="n"
                      type="button"
                      :aria-label="`${t.name} level ${n}`"
                      :title="
                        n <= (workBase[t.key] ?? 0)
                          ? `Species base (Lv ${workBase[t.key]})`
                          : `Lv ${n}`
                      "
                      @click="setWork(t.key, n)"
                    >
                      <span
                        class="block size-3 rounded-sm transition-colors"
                        :class="workPipClass(t.key, n)"
                      />
                    </button>
                  </span>
                  <span class="w-4 text-right text-[10px] tabular-nums text-muted-foreground">
                    {{ work[t.key] ?? 0 }}
                  </span>
                </span>
              </div>
            </div>
            <div v-if="workAddable.length" class="mt-1.5 flex items-center gap-1.5">
              <select
                v-model="workPick"
                class="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Add work suitability…</option>
                <option v-for="t in workAddable" :key="t.key" :value="t.key">
                  {{ t.icon }} {{ t.name }}
                </option>
              </select>
              <Button variant="outline" size="sm" :disabled="!workPick" @click="addWork(workPick)">
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

          <!-- Copy this pal into another player's Pal Box -->
          <div v-if="copyTargets.length" class="mt-4 border-t border-border pt-4">
            <p class="mb-1.5 text-xs font-medium text-muted-foreground">Copy to another player</p>
            <div class="flex items-center gap-1.5">
              <select
                v-model="copyTarget"
                class="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Pick a player…</option>
                <option v-for="t in copyTargets" :key="t.uid" :value="t.uid">
                  {{ t.name ?? t.uid.slice(0, 8) }}
                </option>
              </select>
              <Button
                variant="outline"
                size="sm"
                :disabled="!copyTarget || !canApply || queue.isPending.value"
                @click="queueCopy"
              >
                <Send /> Copy
              </Button>
            </div>
          </div>

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
