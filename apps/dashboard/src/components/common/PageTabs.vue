<script setup lang="ts">
import { cn } from '@tsuki/ui'

defineProps<{ tabs: { key: string; label: string }[]; modelValue: string }>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <div class="flex gap-1 border-b border-border">
    <button
      v-for="t in tabs"
      :key="t.key"
      type="button"
      :class="
        cn(
          '-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition-colors',
          modelValue === t.key
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        )
      "
      @click="$emit('update:modelValue', t.key)"
    >
      {{ t.label }}
    </button>
  </div>
</template>
