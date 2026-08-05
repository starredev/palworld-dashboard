<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ScrollText, Search, Pause, Play } from 'lucide-vue-next'
import { useQuery } from '@tanstack/vue-query'
import { Input, Button, cn } from '@tsuki/ui'
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
  if (/error|fatal|exception|failed/i.test(line)) return 'text-red-400'
  if (/warn/i.test(line)) return 'text-amber-400'
  if (/success|started|online|joined/i.test(line)) return 'text-emerald-400'
  return 'text-zinc-400'
}

// Split a leading "[timestamp]" so it can be dimmed like a real console.
function parts(line: string): { ts: string; rest: string } {
  const m = line.match(/^(\[[^\]]+\]\s*)([\s\S]*)$/)
  return m ? { ts: m[1], rest: m[2] } : { ts: '', rest: line }
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
        <p class="text-sm text-muted-foreground">Live tail of your Palworld server.</p>
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
      description="Point the panel at your server's logs: set PALWORLD_CONTAINER (to read docker logs) or mount the data dir with a Pal.log file at PALWORLD_LOG_PATH."
    />

    <div v-else class="overflow-hidden rounded-xl border border-white/10 bg-[#0a0c11] shadow-2xl">
      <!-- Title bar -->
      <div class="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <span class="size-3 rounded-full bg-[#ff5f56]" />
        <span class="size-3 rounded-full bg-[#ffbd2e]" />
        <span class="size-3 rounded-full bg-[#27c93f]" />
        <span class="ml-2 font-mono text-xs text-white/50">palworld-server — tail -f</span>
        <div class="ml-auto flex items-center gap-3">
          <label class="flex cursor-pointer items-center gap-1.5 text-xs text-white/40">
            <input v-model="autoScroll" type="checkbox" class="accent-emerald-500" />
            auto-scroll
          </label>
          <span class="font-mono text-xs text-white/40">{{ lines.length }} lines</span>
          <span class="flex items-center gap-1.5">
            <span
              :class="
                cn('size-2 rounded-full', live ? 'animate-pulse bg-emerald-400' : 'bg-zinc-500')
              "
            />
            <span class="font-mono text-xs text-white/50">{{ live ? 'streaming' : 'paused' }}</span>
          </span>
        </div>
      </div>

      <!-- Terminal body -->
      <div
        ref="scroller"
        class="max-h-[65vh] overflow-auto bg-[#0a0c11] px-4 py-3 font-mono text-[12.5px] leading-relaxed"
      >
        <p v-if="lines.length === 0" class="text-zinc-500">
          <span class="text-emerald-400">$</span> waiting for output…
        </p>
        <template v-else>
          <div
            v-for="(line, i) in lines"
            :key="i"
            class="group flex gap-3 whitespace-pre-wrap break-all rounded px-1 hover:bg-white/[0.04]"
          >
            <span
              class="select-none text-right text-zinc-700 tabular-nums"
              style="min-width: 2.5rem"
            >
              {{ i + 1 }}
            </span>
            <span :class="tone(line)">
              <span v-if="parts(line).ts" class="text-zinc-600">{{ parts(line).ts }}</span
              >{{ parts(line).rest }}
            </span>
          </div>
          <div class="flex gap-3 px-1">
            <span class="select-none text-right text-zinc-700" style="min-width: 2.5rem" />
            <span class="text-emerald-400"
              >$<span
                class="ml-1 inline-block h-3.5 w-2 animate-pulse bg-emerald-400/80 align-middle"
            /></span>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>
