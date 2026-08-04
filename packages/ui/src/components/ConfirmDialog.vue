<script setup lang="ts">
import { watch } from 'vue'
import Button from './Button.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    tone?: 'default' | 'destructive'
    loading?: boolean
  }>(),
  { confirmLabel: 'Confirm', cancelLabel: 'Cancel', tone: 'default' },
)

const emit = defineEmits<{ 'update:open': [boolean]; confirm: []; cancel: [] }>()

function close(): void {
  emit('update:open', false)
  emit('cancel')
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') close()
}

watch(
  () => props.open,
  (open) => {
    if (typeof document === 'undefined') return
    if (open) document.addEventListener('keydown', onKey)
    else document.removeEventListener('keydown', onKey)
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close" />
        <div
          role="dialog"
          aria-modal="true"
          class="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
        >
          <h2 class="text-base font-semibold tracking-tight">{{ title }}</h2>
          <p v-if="description" class="mt-1.5 text-sm text-muted-foreground">{{ description }}</p>
          <div v-if="$slots.default" class="mt-4"><slot /></div>
          <div class="mt-5 flex justify-end gap-2">
            <Button variant="ghost" :disabled="loading" @click="close">{{ cancelLabel }}</Button>
            <Button
              :variant="tone === 'destructive' ? 'destructive' : 'default'"
              :disabled="loading"
              @click="emit('confirm')"
            >
              {{ confirmLabel }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.15s ease;
}
.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
</style>
