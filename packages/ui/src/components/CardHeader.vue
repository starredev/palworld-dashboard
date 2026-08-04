<script setup lang="ts">
import { cn } from '../lib/cn'

defineProps<{ class?: string }>()
</script>

<template>
  <div :class="cn('flex flex-col gap-1 p-5', $props.class)">
    <slot />
  </div>
</template>
