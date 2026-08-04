<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Menu } from 'lucide-vue-next'
import { StatusDot } from '@tsuki/ui'
import { useHealth } from '@/composables/use-health'

defineEmits<{ toggleSidebar: [] }>()

const route = useRoute()
const title = computed(() => (route.meta.title as string | undefined) ?? 'Tsuki Panel')

const { data, isLoading, isError } = useHealth()

const connection = computed(() => {
  if (isLoading.value) return { tone: 'pending' as const, label: 'Connecting…' }
  if (isError.value || !data.value) return { tone: 'offline' as const, label: 'API offline' }
  return { tone: 'online' as const, label: 'API online' }
})
</script>

<template>
  <header class="flex h-14 items-center gap-3 border-b border-border px-4 lg:px-6">
    <button
      class="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
      aria-label="Toggle navigation"
      @click="$emit('toggleSidebar')"
    >
      <Menu class="size-5" />
    </button>

    <h1 class="text-sm font-semibold tracking-tight">{{ title }}</h1>

    <div class="ml-auto flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
      <StatusDot :tone="connection.tone" :pulse="connection.tone === 'online'" />
      <span class="text-xs text-muted-foreground">{{ connection.label }}</span>
    </div>
  </header>
</template>
