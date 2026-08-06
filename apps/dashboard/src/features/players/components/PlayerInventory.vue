<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loader2, Backpack } from 'lucide-vue-next'
import { Button } from '@tsuki/ui'
import type { InventoryResponse } from '@tsuki/types'
import { api } from '@/lib/api'

const props = defineProps<{ uid: string | null }>()

const data = ref<InventoryResponse | null>(null)
const loading = ref(false)
const error = ref('')

// Reading inventory decodes the player file AND Level.sav, so load on demand.
async function load(): Promise<void> {
  if (!props.uid) {
    error.value = 'This player has no id in the save.'
    return
  }
  loading.value = true
  error.value = ''
  try {
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

/** Trim common id noise for a friendlier label (still the raw static id). */
const pretty = (id: string) => id.replace(/^(PalItem_|Item_)/, '').replace(/_/g, ' ')
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
        <div class="grid grid-cols-2 gap-1">
          <div
            v-for="(item, i) in c.items"
            :key="i"
            class="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1 text-xs"
          >
            <span class="truncate" :title="item.id">{{ pretty(item.id) }}</span>
            <span class="shrink-0 text-muted-foreground">×{{ item.count }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
