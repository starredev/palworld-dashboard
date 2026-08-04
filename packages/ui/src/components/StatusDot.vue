<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '../lib/cn'

type Tone = 'online' | 'offline' | 'pending' | 'neutral'

const props = withDefaults(defineProps<{ tone?: Tone; pulse?: boolean; class?: string }>(), {
  tone: 'neutral',
  pulse: false,
})

const toneClass = computed(
  () =>
    ({
      online: 'bg-emerald-500',
      offline: 'bg-red-500',
      pending: 'bg-amber-500',
      neutral: 'bg-muted-foreground',
    })[props.tone],
)
</script>

<template>
  <span class="relative inline-flex h-2.5 w-2.5" :class="$props.class">
    <span
      v-if="pulse"
      :class="
        cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', toneClass)
      "
    />
    <span :class="cn('relative inline-flex h-2.5 w-2.5 rounded-full', toneClass)" />
  </span>
</template>
