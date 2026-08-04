<script setup lang="ts">
import { cn } from '../lib/cn'

defineProps<{ class?: string }>()
const model = defineModel<string>()
</script>

<template>
  <input
    v-model="model"
    :class="
      cn(
        'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        $props.class,
      )
    "
  />
</template>
