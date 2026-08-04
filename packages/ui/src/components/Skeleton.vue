<script setup lang="ts">
import { cn } from '../lib/cn'

defineProps<{ class?: string }>()
</script>

<template>
  <div :class="cn('animate-pulse rounded-md bg-muted', $props.class)" />
</template>
