<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X, Loader2, Layers } from 'lucide-vue-next'
import { Button, Input } from '@tsuki/ui'
import type { PalPlayer } from '@tsuki/types'
import { api } from '@/lib/api'
import { useQueueOp } from '@/composables/use-save-batch'

const props = defineProps<{ player: PalPlayer | null; others: PalPlayer[] }>()
const emit = defineEmits<{ close: []; done: [] }>()

const form = ref({ x: '', y: '', z: '' })
const loadingLoc = ref(false)
const loadError = ref('')
const copyFrom = ref('')

/** Load a player's saved position into the form (own position, or a target's). */
async function loadInto(uid: string | null): Promise<void> {
  loadError.value = ''
  if (!uid) {
    loadError.value = 'This player has no id in the save file.'
    return
  }
  loadingLoc.value = true
  try {
    const res = await api.getPlayerSaveLocation(uid)
    if (res.location) {
      form.value = {
        x: String(Math.round(res.location.x)),
        y: String(Math.round(res.location.y)),
        z: String(Math.round(res.location.z)),
      }
    } else {
      loadError.value = 'No saved position found for this player yet.'
    }
  } catch (error) {
    loadError.value = (error as Error).message
  } finally {
    loadingLoc.value = false
  }
}

watch(
  () => props.player,
  (p) => {
    form.value = { x: '', y: '', z: '' }
    copyFrom.value = ''
    loadError.value = ''
    if (p) void loadInto(p.playerId)
  },
  { immediate: true },
)

function onCopyFrom(): void {
  const other = props.others.find((o) => o.playerId === copyFrom.value)
  if (other) void loadInto(other.playerId)
}

const valid = computed(() => {
  if (!props.player?.playerId) return false
  return (['x', 'y', 'z'] as const).every((k) => {
    const v = form.value[k]
    return v.trim() !== '' && !Number.isNaN(Number(v))
  })
})

const queue = useQueueOp()
function queueEdit(): void {
  const p = props.player!
  const coords = { x: Number(form.value.x), y: Number(form.value.y), z: Number(form.value.z) }
  queue.mutate(
    {
      type: 'teleport',
      uid: p.playerId!,
      label: `Teleport ${p.name} → ${coords.x}, ${coords.y}`,
      coords,
    },
    { onSuccess: () => (emit('done'), emit('close')) },
  )
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="player" class="fixed inset-0 z-50 flex items-center justify-center p-4">
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

          <h2 class="text-base font-semibold tracking-tight">Teleport {{ player.name }}</h2>
          <p class="mt-1 text-xs text-muted-foreground">
            Rewrites the player's saved position — works for Xbox players too.
          </p>

          <!-- Copy a target position from another player -->
          <label class="mt-5 block text-xs font-medium text-muted-foreground">
            Copy position from
          </label>
          <select
            v-model="copyFrom"
            class="mt-1.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            @change="onCopyFrom"
          >
            <option value="">Keep current position</option>
            <option
              v-for="o in others"
              :key="o.playerId ?? o.name"
              :value="o.playerId ?? ''"
              :disabled="!o.playerId"
            >
              {{ o.name }}
            </option>
          </select>

          <!-- X / Y / Z -->
          <div class="mt-4 grid grid-cols-3 gap-2">
            <label v-for="axis in ['x', 'y', 'z'] as const" :key="axis" class="block">
              <span class="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                {{ axis }}
              </span>
              <Input v-model="form[axis]" type="number" :placeholder="axis" />
            </label>
          </div>

          <p v-if="loadingLoc" class="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 class="size-3.5 animate-spin" /> Reading saved position…
          </p>
          <p v-else-if="loadError" class="mt-2 text-xs text-amber-400">{{ loadError }}</p>

          <div
            class="mt-5 flex gap-2.5 rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs text-primary/90"
          >
            <Layers class="mt-0.5 size-4 shrink-0" />
            <span
              >Queued to the batch — nothing changes until you press “Apply all”, which restarts the
              server once.</span
            >
          </div>

          <p v-if="queue.isError.value" class="mt-3 text-xs text-red-400">
            {{ (queue.error.value as Error)?.message ?? 'Failed to queue.' }}
          </p>

          <div class="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm" @click="emit('close')">Cancel</Button>
            <Button size="sm" :disabled="!valid || queue.isPending.value" @click="queueEdit">
              <Layers /> Add to batch
            </Button>
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
