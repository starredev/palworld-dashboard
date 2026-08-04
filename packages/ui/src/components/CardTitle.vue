<script setup lang="ts">
import { cn } from '../lib/cn'

defineProps<{ class?: string }>()
</script>

<template>
  <h3 :class="cn('text-sm font-medium text-muted-foreground', $props.class)">
    <slot />
  </h3>
</template>
