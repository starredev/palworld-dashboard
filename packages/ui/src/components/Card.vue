<script setup lang="ts">
import { cn } from '../lib/cn'

defineProps<{ class?: string }>()
</script>

<template>
  <div :class="cn('rounded-2xl border border-border bg-card text-card-foreground', $props.class)">
    <slot />
  </div>
</template>
