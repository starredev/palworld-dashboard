<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { ExternalLink, Map as MapIcon } from 'lucide-vue-next'
import { Button } from '@tsuki/ui'
import { api } from '@/lib/api'

/**
 * The live-map opens in a new tab — most map tools block iframe embedding, so a
 * launcher is more reliable than a broken embed. The URL comes from the API at
 * runtime (LIVEMAP_URL env), falling back to the same host on :3001.
 */
const { data } = useQuery({ queryKey: ['config'], queryFn: () => api.getConfig() })

const liveMapUrl = computed(() => {
  if (data.value?.liveMapUrl) return data.value.liveMapUrl
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:3001`
})

const host = computed(() => {
  try {
    return new URL(liveMapUrl.value).host
  } catch {
    return liveMapUrl.value
  }
})
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-1">
      <h2 class="text-xl font-semibold tracking-tight">Live map</h2>
      <p class="text-sm text-muted-foreground">
        Real-time player, guild and pal positions from your live-map service.
      </p>
    </header>

    <div
      class="flex min-h-[55vh] flex-col items-center justify-center gap-5 rounded-2xl border border-border bg-card p-8 text-center"
    >
      <span class="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <MapIcon class="size-7" />
      </span>
      <div class="space-y-1.5">
        <h3 class="text-lg font-semibold tracking-tight">Open the live map</h3>
        <p class="max-w-md text-sm text-muted-foreground">
          It opens in a new tab and shows live players, guilds and pals across the world.
        </p>
      </div>
      <a :href="liveMapUrl" target="_blank" rel="noopener noreferrer">
        <Button size="lg">
          <ExternalLink />
          Open live map
        </Button>
      </a>
      <p class="font-mono text-xs text-muted-foreground/70">{{ host }}</p>
    </div>
  </section>
</template>
