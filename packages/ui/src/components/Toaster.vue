<script setup lang="ts">
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-vue-next'
import { toasts, dismissToast, type ToastTone } from '../lib/toast'

const icon: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}
const iconColor: Record<ToastTone, string> = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  info: 'text-sky-400',
}
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed right-4 top-4 z-[60] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-border bg-card p-3.5 shadow-2xl"
        >
          <component :is="icon[t.tone]" class="mt-0.5 size-4 shrink-0" :class="iconColor[t.tone]" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium leading-snug">{{ t.message }}</p>
            <p v-if="t.description" class="mt-0.5 text-xs text-muted-foreground">
              {{ t.description }}
            </p>
          </div>
          <button
            class="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Dismiss"
            @click="dismissToast(t.id)"
          >
            <X class="size-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(1rem);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(1rem);
}
.toast-leave-active {
  position: absolute;
  right: 0;
  width: 100%;
}
.toast-move {
  transition: transform 0.22s ease;
}
</style>
