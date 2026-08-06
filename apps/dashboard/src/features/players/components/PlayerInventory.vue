<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loader2, Backpack, Layers } from 'lucide-vue-next'
import { Button, Input } from '@tsuki/ui'
import type { InventoryResponse } from '@tsuki/types'
import { api } from '@/lib/api'
import { useQueueOp } from '@/composables/use-save-batch'

const props = defineProps<{ uid: string | null; canEdit?: boolean }>()

const data = ref<InventoryResponse | null>(null)
const loading = ref(false)
const error = ref('')

// id -> { n: display name, c: category }. Lazy-loaded (big) on first inventory read.
type ItemMeta = { n: string; c: string }
const items = ref<Record<string, ItemMeta>>({})
const itemsLower = ref<Record<string, ItemMeta>>({})

// Reading inventory decodes the player file AND Level.sav, so load on demand.
async function load(): Promise<void> {
  if (!props.uid) {
    error.value = 'This player has no id in the save.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    if (!Object.keys(items.value).length) {
      items.value = (await import('../items.json')).default as Record<string, ItemMeta>
      itemsLower.value = Object.fromEntries(
        Object.entries(items.value).map(([k, v]) => [k.toLowerCase(), v]),
      )
    }
    data.value = await api.getInventory(props.uid)
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
  },
)

const pretty = (id: string) => id.replace(/^(PalItem_|Item_)/, '').replace(/_/g, ' ')
const meta = (id: string): ItemMeta | undefined =>
  items.value[id] ?? itemsLower.value[id.toLowerCase()]
const label = (id: string) => meta(id)?.n ?? pretty(id)

const CAT_COLOR: Record<string, string> = {
  Material: '#a3a3a3',
  Ammo: '#f59e0b',
  Food: '#4ade80',
  Consume: '#38bdf8',
  Weapon: '#f87171',
  SpecialWeapon: '#fb7185',
  Armor: '#818cf8',
  Accessory: '#c084fc',
  Essential: '#facc15',
  Blueprint: '#22d3ee',
}
const catColor = (id: string) => CAT_COLOR[meta(id)?.c ?? 'Material'] ?? '#71717a'

// ---- Give item ----
const giveSearch = ref('')
const givePicked = ref<{ id: string; n: string } | null>(null)
const giveCount = ref(1)
const showList = ref(false)

const giveMatches = computed(() => {
  const q = giveSearch.value.trim().toLowerCase()
  if (q.length < 2) return []
  const out: { id: string; n: string }[] = []
  for (const [id, m] of Object.entries(items.value)) {
    if (m.n.toLowerCase().includes(q)) out.push({ id, n: m.n })
    if (out.length >= 12) break
  }
  return out
})
function pickGive(m: { id: string; n: string }): void {
  givePicked.value = m
  giveSearch.value = m.n
  showList.value = false
}

const queue = useQueueOp()
function queueGive(): void {
  if (!props.uid || !givePicked.value) return
  const count = Math.max(1, giveCount.value)
  queue.mutate(
    {
      type: 'giveItem',
      uid: props.uid,
      label: `Give ${count}× ${givePicked.value.n}`,
      item: { staticId: givePicked.value.id, count },
    },
    {
      onSuccess: () => {
        givePicked.value = null
        giveSearch.value = ''
        giveCount.value = 1
      },
    },
  )
}
</script>

<template>
  <div class="mt-5 border-t border-border pt-4">
    <div class="flex items-center justify-between">
      <h4 class="text-xs font-medium text-muted-foreground">Inventory</h4>
      <Button v-if="!data && !loading" variant="outline" size="sm" @click="load">
        <Backpack /> Load inventory
      </Button>
    </div>

    <p v-if="loading" class="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 class="size-3.5 animate-spin" /> Reading the save…
    </p>
    <p v-else-if="error" class="mt-2 text-xs text-amber-400">{{ error }}</p>

    <template v-else-if="data">
      <p v-if="!data.containers.length" class="mt-2 text-xs text-muted-foreground">
        No items found.
      </p>
      <div v-for="c in data.containers" :key="c.name" class="mt-3">
        <p class="mb-1 text-[11px] font-medium text-muted-foreground">{{ c.name }}</p>
        <div class="grid grid-cols-2 gap-1 sm:grid-cols-3">
          <div
            v-for="(item, i) in c.items"
            :key="i"
            class="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-xs"
          >
            <span
              class="size-2 shrink-0 rounded-full"
              :style="{ backgroundColor: catColor(item.id) }"
            />
            <span class="min-w-0 flex-1 truncate" :title="item.id">{{ label(item.id) }}</span>
            <span class="shrink-0 font-medium text-muted-foreground">×{{ item.count }}</span>
          </div>
        </div>
      </div>

      <!-- Give item (admin) -->
      <div v-if="canEdit" class="mt-4 border-t border-border pt-3">
        <p class="mb-1.5 text-xs font-medium text-muted-foreground">Give item</p>
        <div class="flex flex-wrap items-center gap-2">
          <div class="relative min-w-[12rem] flex-1">
            <Input
              v-model="giveSearch"
              placeholder="Search an item…"
              @focus="showList = true"
              @input="showList = true"
            />
            <div
              v-if="showList && giveMatches.length"
              class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-xl"
            >
              <button
                v-for="m in giveMatches"
                :key="m.id"
                type="button"
                class="block w-full px-3 py-1.5 text-left text-xs hover:bg-accent"
                @click="pickGive(m)"
              >
                {{ m.n }}
              </button>
            </div>
          </div>
          <Input v-model.number="giveCount" type="number" min="1" class="w-20" />
          <Button
            variant="outline"
            size="sm"
            :disabled="!givePicked || queue.isPending.value"
            @click="queueGive"
          >
            <Layers /> Add to batch
          </Button>
        </div>
        <p v-if="queue.isError.value" class="mt-2 text-xs text-red-400">
          {{ (queue.error.value as Error)?.message ?? 'Failed to queue.' }}
        </p>
      </div>
    </template>
  </div>
</template>
