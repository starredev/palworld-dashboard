<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loader2, Lock, LockOpen, Eye, EyeOff, Check } from 'lucide-vue-next'
import { Button } from '@tsuki/ui'
import type { LockedChest, LockedChestsResponse } from '@tsuki/types'
import { api } from '@/lib/api'
import { useQueueOp } from '@/composables/use-save-batch'

const props = defineProps<{ uid: string | null; canEdit?: boolean }>()

const data = ref<LockedChestsResponse | null>(null)
const loading = ref(false)
const error = ref('')
const revealed = ref<Set<string>>(new Set())
const queued = ref<Set<string>>(new Set())

// Reading chest locks decodes the whole Level.sav (map objects included), so
// load on demand rather than eagerly.
async function load(): Promise<void> {
  if (!props.uid) {
    error.value = 'This player has no id in the save.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    data.value = await api.getLockedChests(props.uid)
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

watch(
  () => props.uid,
  () => {
    data.value = null
    error.value = ''
    revealed.value = new Set()
    queued.value = new Set()
  },
)

function toggleReveal(id: string): void {
  const s = new Set(revealed.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  revealed.value = s
}

const queue = useQueueOp()
function queueUnlock(chest: LockedChest): void {
  queue.mutate(
    {
      type: 'chestUnlock',
      chestId: chest.id,
      label: `Unlock ${chest.label}${chest.ownerName ? ` (${chest.ownerName})` : ''}`,
    },
    { onSuccess: () => (queued.value = new Set(queued.value).add(chest.id)) },
  )
}

const loc = (c: LockedChest) => `${Math.round(c.location.x)}, ${Math.round(c.location.y)}`
</script>

<template>
  <div class="mt-5 border-t border-border pt-4">
    <div class="flex items-center justify-between">
      <h4 class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Lock class="size-3.5" /> Locked chests
      </h4>
      <Button v-if="!data && !loading" variant="outline" size="sm" @click="load">
        <Lock /> Load locked chests
      </Button>
    </div>

    <p v-if="loading" class="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 class="size-3.5 animate-spin" /> Reading the save…
    </p>
    <p v-else-if="error" class="mt-2 text-xs text-amber-400">{{ error }}</p>

    <template v-else-if="data">
      <p v-if="!data.chests.length" class="mt-2 text-xs text-muted-foreground">
        This player has no password-locked chests.
      </p>
      <ul v-else class="mt-3 space-y-1.5">
        <li
          v-for="chest in data.chests"
          :key="chest.id"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-muted/30 px-3 py-2 text-xs"
        >
          <span class="flex items-center gap-1.5 font-medium">
            <Lock class="size-3.5 text-amber-400" /> {{ chest.label }}
          </span>
          <span
            class="font-mono text-muted-foreground"
            :title="`x ${chest.location.x}, y ${chest.location.y}`"
          >
            {{ loc(chest) }}
          </span>

          <!-- Password (masked until revealed) -->
          <span class="flex items-center gap-1">
            <span class="text-muted-foreground">Password</span>
            <code class="rounded bg-background px-1.5 py-0.5 font-mono tabular-nums">
              {{ revealed.has(chest.id) ? chest.password || '—' : '••••' }}
            </code>
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground"
              :title="revealed.has(chest.id) ? 'Hide' : 'Show'"
              @click="toggleReveal(chest.id)"
            >
              <EyeOff v-if="revealed.has(chest.id)" class="size-3.5" />
              <Eye v-else class="size-3.5" />
            </button>
          </span>

          <span v-if="chest.access.length" class="text-muted-foreground/80">
            access: {{ chest.access.join(', ') }}
          </span>

          <span class="ml-auto">
            <span
              v-if="queued.has(chest.id)"
              class="inline-flex items-center gap-1 text-emerald-400"
            >
              <Check class="size-3.5" /> Queued
            </span>
            <Button
              v-else-if="canEdit"
              variant="outline"
              size="sm"
              :disabled="queue.isPending.value"
              @click="queueUnlock(chest)"
            >
              <LockOpen /> Unlock
            </Button>
          </span>
        </li>
      </ul>
      <p v-if="canEdit && data.chests.length" class="mt-2 text-[11px] text-muted-foreground/70">
        Unlocking clears the password; it applies with the next batch (one server restart).
      </p>
    </template>
  </div>
</template>
