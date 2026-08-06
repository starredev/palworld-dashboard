<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { X, TriangleAlert, HeartPulse } from 'lucide-vue-next'
import { Button, Input, ConfirmDialog } from '@tsuki/ui'
import type { PalSummary } from '@tsuki/types'
import { api } from '@/lib/api'

const props = defineProps<{ pal: PalSummary | null; uid: string | null }>()
const emit = defineEmits<{ close: []; done: [] }>()

const form = ref({ level: '', hp: '', shot: '', defense: '', heal: false })

watch(
  () => props.pal,
  (p) => {
    form.value = {
      level: p?.level != null ? String(p.level) : '',
      hp: p?.talentHp != null ? String(p.talentHp) : '0',
      shot: p?.talentShot != null ? String(p.talentShot) : '0',
      defense: p?.talentDefense != null ? String(p.talentDefense) : '0',
      heal: false,
    }
  },
  { immediate: true },
)

const title = computed(
  () => props.pal?.nickname || props.pal?.species.replace('BOSS_', '') || 'Pal',
)
const num = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

const confirming = ref(false)
const edit = useMutation({
  mutationFn: () =>
    api.editPal(props.uid!, props.pal!.instanceId!, {
      level: num(form.value.level),
      talentHp: num(form.value.hp),
      talentShot: num(form.value.shot),
      talentDefense: num(form.value.defense),
      ...(form.value.heal ? { heal: true } : {}),
    }),
  onSuccess: () => {
    confirming.value = false
    emit('done')
    emit('close')
  },
})

const canApply = computed(() => !!props.pal?.instanceId && !!props.uid)
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="pal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />
        <div
          role="dialog"
          aria-modal="true"
          class="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
        >
          <button
            class="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            aria-label="Close"
            @click="emit('close')"
          >
            <X class="size-4" />
          </button>

          <h2 class="text-base font-semibold tracking-tight">Edit {{ title }}</h2>
          <p class="mt-1 text-xs text-muted-foreground">{{ pal.species.replace('BOSS_', '') }}</p>

          <label class="mt-5 block text-xs font-medium text-muted-foreground">Level</label>
          <Input v-model="form.level" type="number" class="mt-1.5 w-28" placeholder="Level" />

          <p class="mt-4 text-xs font-medium text-muted-foreground">IVs / Talents (0–100)</p>
          <div class="mt-1.5 grid grid-cols-3 gap-2">
            <label
              v-for="f in [
                { k: 'hp', l: 'HP' },
                { k: 'shot', l: 'Shot' },
                { k: 'defense', l: 'Def' },
              ]"
              :key="f.k"
            >
              <span class="mb-1 block text-[10px] uppercase text-muted-foreground">{{ f.l }}</span>
              <Input v-model="form[f.k as 'hp' | 'shot' | 'defense']" type="number" />
            </label>
          </div>

          <label class="mt-4 flex cursor-pointer items-center gap-2 text-sm">
            <input v-model="form.heal" type="checkbox" class="size-4 accent-emerald-400" />
            <HeartPulse class="size-4 text-emerald-400" /> Fully heal (HP, hunger, cure sickness)
          </label>

          <div
            class="mt-5 flex gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200/90"
          >
            <TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-400" />
            <span>Editing the save stops the server and restarts it. A backup is taken first.</span>
          </div>

          <p v-if="edit.isError.value" class="mt-3 text-xs text-red-400">
            {{ (edit.error.value as Error)?.message ?? 'Edit failed.' }}
          </p>

          <div class="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm" @click="emit('close')">Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              :disabled="!canApply || edit.isPending.value"
              @click="confirming = true"
            >
              Apply &amp; restart
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <ConfirmDialog
    :open="confirming"
    title="Edit this pal and restart?"
    :description="`${title} will be updated in the save. The server restarts and everyone disconnects briefly.`"
    tone="destructive"
    confirm-label="Apply & restart"
    :loading="edit.isPending.value"
    @update:open="(v: boolean) => !v && (confirming = false)"
    @confirm="edit.mutate()"
  />
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
