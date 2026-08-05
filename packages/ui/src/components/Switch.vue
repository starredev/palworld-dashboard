<script setup lang="ts">
import { cn } from '../lib/cn'

const model = defineModel<boolean>({ default: false })
const props = defineProps<{ disabled?: boolean }>()

function toggle(): void {
  if (!props.disabled) model.value = !model.value
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    :disabled="disabled"
    :class="
      cn(
        'inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        model ? 'bg-primary' : 'bg-muted',
      )
    "
    @click="toggle"
  >
    <span
      :class="
        cn(
          'pointer-events-none block size-5 rounded-full bg-background shadow-sm transition-transform',
          model ? 'translate-x-5' : 'translate-x-0',
        )
      "
    />
  </button>
</template>
