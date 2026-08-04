<script setup lang="ts">
import type { LucideIcon } from 'lucide-vue-next'

defineProps<{ icon: LucideIcon; title: string; description: string }>()
</script>

<template>
  <div
    class="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border text-center"
  >
    <span class="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
      <component :is="icon" class="size-6" />
    </span>
    <div class="space-y-1">
      <h2 class="text-base font-semibold tracking-tight">{{ title }}</h2>
      <p class="max-w-sm text-sm text-muted-foreground">{{ description }}</p>
    </div>
  </div>
</template>
