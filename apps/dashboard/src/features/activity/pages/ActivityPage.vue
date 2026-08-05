<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { Cpu } from 'lucide-vue-next'
import { Card, Skeleton } from '@tsuki/ui'
import { api } from '@/lib/api'

const query = useQuery({
  queryKey: ['audit'],
  queryFn: () => api.getAudit(200),
  refetchInterval: 10_000,
})

const entries = computed(() => query.data.value?.entries ?? [])

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.round(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function absoluteTime(iso: string): string {
  return new Date(iso).toLocaleString()
}
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-1">
      <h2 class="text-xl font-semibold tracking-tight">Activity</h2>
      <p class="text-sm text-muted-foreground">
        Every server action — who did what, and when. Newest first.
      </p>
    </header>

    <Card>
      <div v-if="query.isLoading.value" class="space-y-3 p-4">
        <Skeleton v-for="i in 6" :key="i" class="h-12 w-full" />
      </div>

      <p v-else-if="!entries.length" class="p-8 text-center text-sm text-muted-foreground">
        No activity recorded yet.
      </p>

      <ul v-else class="divide-y divide-border">
        <li v-for="entry in entries" :key="entry.id" class="flex items-center gap-3 p-3.5">
          <span
            class="grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold uppercase"
            :class="
              entry.actorId === 'system'
                ? 'bg-primary/15 text-primary'
                : 'bg-muted text-muted-foreground'
            "
          >
            <Cpu v-if="entry.actorId === 'system'" class="size-4" />
            <template v-else>{{ entry.actorName.charAt(0) }}</template>
          </span>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm">
              <span class="font-medium">{{ entry.actorName }}</span>
              <span class="text-muted-foreground"> · {{ entry.summary }}</span>
            </p>
            <p class="mt-0.5 font-mono text-xs text-muted-foreground/70">{{ entry.action }}</p>
          </div>

          <time
            :datetime="entry.at"
            :title="absoluteTime(entry.at)"
            class="shrink-0 text-xs text-muted-foreground"
          >
            {{ relativeTime(entry.at) }}
          </time>
        </li>
      </ul>
    </Card>
  </section>
</template>
