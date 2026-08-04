<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ScrollText, Search, Pause, Play } from 'lucide-vue-next'
import { useQuery } from '@tanstack/vue-query'
import { Card, Input, Button } from '@tsuki/ui'
import { api } from '@/lib/api'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'

const live = ref(true)
const { data } = useQuery({
  queryKey: ['logs'],
  queryFn: () => api.getLogs(1000),
  refetchInterval: () => (live.value ? 3000 : false),
})

const unavailable = computed(() => data.value && !data.value.available)
const allLines = computed(() => data.value?.lines ?? [])
const search = ref('')
const lines = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? allLines.value.filter((l) => l.toLowerCase().includes(q)) : allLines.value
})

function tone(line: string): string {
  if (/error|fatal|exception/i.test(line)) return 'text-red-400'
  if (/warn/i.test(line)) return 'text-amber-400'
  return 'text-muted-foreground'
}

const scroller = ref<HTMLElement>()
const autoScroll = ref(true)
watch(lines, async () => {
  if (!autoScroll.value) return
  await nextTick()
  const el = scroller.value
  if (el) el.scrollTop = el.scrollHeight
})
</script>

<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div class="space-y-1">
        <h2 class="text-xl font-semibold tracking-tight">Logs</h2>
        <p class="text-sm text-muted-foreground">Live tail of your Palworld server log.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input v-model="search" placeholder="Filter…" class="w-48 pl-9" />
        </div>
        <Button variant="outline" size="sm" @click="live = !live">
          <Pause v-if="live" />
          <Play v-else />
          {{ live ? 'Pause' : 'Resume' }}
        </Button>
      </div>
    </header>

    <PagePlaceholder
      v-if="unavailable"
      :icon="ScrollText"
      title="Logs unavailable"
      description="Mount your Palworld data dir and set PALWORLD_LOG_PATH so the panel can read Pal.log."
    />

    <Card v-else class="overflow-hidden">
      <div ref="scroller" class="max-h-[65vh] overflow-auto p-4 font-mono text-xs leading-relaxed">
        <p v-if="lines.length === 0" class="text-muted-foreground">No log lines.</p>
        <div
          v-for="(line, i) in lines"
          :key="i"
          :class="['whitespace-pre-wrap break-all', tone(line)]"
        >
          {{ line }}
        </div>
      </div>
    </Card>

    <label class="flex items-center gap-2 text-xs text-muted-foreground">
      <input v-model="autoScroll" type="checkbox" class="accent-primary" />
      Auto-scroll to newest
    </label>
  </section>
</template>
