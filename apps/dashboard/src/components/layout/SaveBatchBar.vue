<script setup lang="ts">
import { ref } from 'vue'
import {
  Layers,
  Trash2,
  Loader2,
  ChevronUp,
  ChevronDown,
  X,
  Check,
  TriangleAlert,
} from 'lucide-vue-next'
import { Button, ConfirmDialog } from '@tsuki/ui'
import { useSaveBatch } from '@/composables/use-save-batch'

const { ops, remove, clear, apply } = useSaveBatch()
const open = ref(false)
const confirming = ref(false)
const result = ref<{ applied: number; failed: { label: string; error: string }[] } | null>(null)

function onApply(): void {
  apply.mutate(undefined, {
    onSuccess: (r) => {
      result.value = r
      confirming.value = false
      open.value = false
    },
  })
}
</script>

<template>
  <div v-if="ops.length" class="fixed bottom-4 right-4 z-40 w-[22rem] max-w-[calc(100vw-2rem)]">
    <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <button
        class="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-accent/40"
        @click="open = !open"
      >
        <span
          class="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"
        >
          <Layers class="size-4" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">
            {{ ops.length }} pending change{{ ops.length === 1 ? '' : 's' }}
          </p>
          <p class="truncate text-xs text-muted-foreground">Apply all with one server restart</p>
        </div>
        <component :is="open ? ChevronDown : ChevronUp" class="size-4 text-muted-foreground" />
      </button>

      <div v-if="open" class="max-h-64 overflow-y-auto border-t border-border">
        <div
          v-for="op in ops"
          :key="op.id"
          class="flex items-center gap-2 border-b border-border/50 px-4 py-2 text-xs last:border-0"
        >
          <span class="min-w-0 flex-1 truncate">
            {{ op.label }}
            <span v-if="op.by" class="text-muted-foreground/70">· {{ op.by }}</span>
          </span>
          <button
            class="shrink-0 text-muted-foreground hover:text-foreground"
            :disabled="remove.isPending.value"
            @click="remove.mutate(op.id)"
          >
            <X class="size-3.5" />
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2 border-t border-border p-3">
        <Button
          variant="ghost"
          size="sm"
          :disabled="clear.isPending.value || apply.isPending.value"
          @click="clear.mutate()"
        >
          <Trash2 /> Clear
        </Button>
        <Button
          class="flex-1"
          size="sm"
          :disabled="apply.isPending.value"
          @click="confirming = true"
        >
          <Loader2 v-if="apply.isPending.value" class="animate-spin" />
          Apply all &amp; restart
        </Button>
      </div>
    </div>
  </div>

  <!-- Result toast -->
  <div
    v-if="result"
    class="fixed bottom-4 right-4 z-40 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-4 shadow-2xl"
  >
    <div class="flex items-start gap-2.5">
      <Check v-if="!result.failed.length" class="mt-0.5 size-4 shrink-0 text-emerald-400" />
      <TriangleAlert v-else class="mt-0.5 size-4 shrink-0 text-amber-400" />
      <div class="min-w-0 flex-1 text-sm">
        <p class="font-medium">
          Applied {{ result.applied }} change{{ result.applied === 1 ? '' : 's' }}.
        </p>
        <ul v-if="result.failed.length" class="mt-1 space-y-0.5 text-xs text-amber-400">
          <li v-for="(f, i) in result.failed" :key="i">✗ {{ f.label }} — {{ f.error }}</li>
        </ul>
      </div>
      <button class="text-muted-foreground hover:text-foreground" @click="result = null">
        <X class="size-4" />
      </button>
    </div>
  </div>

  <ConfirmDialog
    :open="confirming"
    title="Apply all pending edits?"
    :description="`This applies ${ops.length} change(s) to the save, then stops and restarts the server once. Everyone disconnects briefly. A backup is taken first.`"
    tone="destructive"
    confirm-label="Apply all & restart"
    :loading="apply.isPending.value"
    @update:open="(v: boolean) => !v && (confirming = false)"
    @confirm="onApply"
  />
</template>
