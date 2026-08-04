<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink } from 'lucide-vue-next'
import { Button } from '@tsuki/ui'

/**
 * Embeds the palworld-live-map. Defaults to the same host on port 3001 (its
 * typical published port), overridable at build time via VITE_LIVEMAP_URL.
 */
const liveMapUrl = computed(() => {
  const configured = import.meta.env.VITE_LIVEMAP_URL
  if (configured) return configured
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:3001`
})
</script>

<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div class="space-y-1">
        <h2 class="text-xl font-semibold tracking-tight">Live map</h2>
        <p class="text-sm text-muted-foreground">
          Real-time positions from your live-map service. Not showing?
          <a
            :href="liveMapUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-foreground underline underline-offset-4"
            >open it directly</a
          >.
        </p>
      </div>
      <a :href="liveMapUrl" target="_blank" rel="noopener noreferrer">
        <Button variant="outline">
          <ExternalLink />
          Open in new tab
        </Button>
      </a>
    </header>

    <div class="h-[75vh] overflow-hidden rounded-2xl border border-border bg-card">
      <iframe
        :src="liveMapUrl"
        class="h-full w-full border-0"
        title="Palworld live map"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
    </div>
  </section>
</template>
