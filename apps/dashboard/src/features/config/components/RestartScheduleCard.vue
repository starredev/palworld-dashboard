<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { CalendarClock, Loader2, Check } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, cn } from '@tsuki/ui'
import { api } from '@/lib/api'
import type { RestartSchedule } from '@tsuki/types'

const qc = useQueryClient()
const query = useQuery({ queryKey: ['restartSchedule'], queryFn: () => api.getRestartSchedule() })

const form = reactive<RestartSchedule>({
  enabled: false,
  time: '04:00',
  warnMinutes: 5,
  skipIfPlayersOnline: false,
})
const nextRun = ref<string | null>(null)

watch(
  () => query.data.value,
  (d) => {
    if (!d) return
    form.enabled = d.enabled
    form.time = d.time
    form.warnMinutes = d.warnMinutes
    form.skipIfPlayersOnline = d.skipIfPlayersOnline
    nextRun.value = d.nextRun
  },
  { immediate: true },
)

const save = useMutation({
  mutationFn: () =>
    api.updateRestartSchedule({
      enabled: form.enabled,
      time: form.time,
      warnMinutes: Number(form.warnMinutes),
      skipIfPlayersOnline: form.skipIfPlayersOnline,
    }),
  onSuccess: (data) => {
    qc.setQueryData(['restartSchedule'], data)
    nextRun.value = data.nextRun
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  },
})
const saved = ref(false)

function formatNext(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-foreground">
        <CalendarClock class="size-4 text-muted-foreground" />
        Scheduled restart
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div class="space-y-0.5">
          <p class="text-sm font-medium">Automatic daily restart</p>
          <p class="text-xs text-muted-foreground">
            Force-restarts the server so it reboots with the current config — never reverts it.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="form.enabled"
          :class="
            cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors',
              form.enabled ? 'bg-primary' : 'bg-muted',
            )
          "
          @click="form.enabled = !form.enabled"
        >
          <span
            :class="
              cn(
                'absolute top-0.5 size-5 rounded-full bg-background transition-transform',
                form.enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
              )
            "
          />
        </button>
      </div>

      <div
        class="grid gap-4 sm:grid-cols-2"
        :class="form.enabled ? '' : 'pointer-events-none opacity-50'"
      >
        <div class="space-y-1.5">
          <label class="text-sm font-medium"
            >Time <span class="text-muted-foreground">(server time)</span></label
          >
          <Input v-model="form.time" type="time" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Warn players (minutes)</label>
          <Input v-model="form.warnMinutes" type="number" min="0" max="60" />
        </div>
        <div class="flex items-center justify-between gap-3 sm:col-span-2">
          <label class="text-sm font-medium">Skip if players are online</label>
          <button
            type="button"
            role="switch"
            :aria-checked="form.skipIfPlayersOnline"
            :class="
              cn(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                form.skipIfPlayersOnline ? 'bg-primary' : 'bg-muted',
              )
            "
            @click="form.skipIfPlayersOnline = !form.skipIfPlayersOnline"
          >
            <span
              :class="
                cn(
                  'absolute top-0.5 size-5 rounded-full bg-background transition-transform',
                  form.skipIfPlayersOnline ? 'translate-x-[22px]' : 'translate-x-0.5',
                )
              "
            />
          </button>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <Button :disabled="save.isPending.value" @click="save.mutate()">
          <Loader2 v-if="save.isPending.value" class="animate-spin" />
          <Check v-else-if="saved" />
          {{ saved ? 'Saved' : 'Save schedule' }}
        </Button>
        <span v-if="form.enabled && nextRun" class="text-sm text-muted-foreground">
          Next restart: <span class="text-foreground">{{ formatNext(nextRun) }}</span>
        </span>
      </div>

      <p
        v-if="save.error.value"
        class="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        Couldn't save the schedule: {{ save.error.value.message }}.
      </p>
    </CardContent>
  </Card>
</template>
