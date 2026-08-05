<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarRange, Trash2, Loader2, Plus, ArrowRight } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, cn } from '@tsuki/ui'
import { useConfigProfiles } from '../use-config-profiles'

const { query, createEvent, deleteEvent } = useConfigProfiles()

const profiles = computed(() => query.data.value?.profiles ?? [])
const events = computed(() => query.data.value?.events ?? [])
const nameById = computed(() => new Map(profiles.value.map((p) => [p.id, p.name])))

const form = ref({ name: '', profileId: '', revertProfileId: '', startsAt: '', endsAt: '' })
const error = ref('')

function toIso(local: string): string {
  return new Date(local).toISOString()
}

function onCreate(): void {
  error.value = ''
  const f = form.value
  if (!f.name.trim() || !f.profileId || !f.revertProfileId || !f.startsAt || !f.endsAt) {
    error.value = 'Fill in every field.'
    return
  }
  if (new Date(f.endsAt) <= new Date(f.startsAt)) {
    error.value = 'The end time must be after the start time.'
    return
  }
  createEvent.mutate(
    {
      name: f.name.trim(),
      profileId: f.profileId,
      revertProfileId: f.revertProfileId,
      startsAt: toIso(f.startsAt),
      endsAt: toIso(f.endsAt),
    },
    {
      onSuccess: () =>
        (form.value = { name: '', profileId: '', revertProfileId: '', startsAt: '', endsAt: '' }),
    },
  )
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS = {
  upcoming: { label: 'Upcoming', class: 'bg-muted text-muted-foreground' },
  active: { label: 'Active', class: 'bg-primary/15 text-primary' },
  done: { label: 'Done', class: 'bg-muted text-muted-foreground/70' },
} as const

const selectClass =
  'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-foreground">
        <CalendarRange class="size-4 text-muted-foreground" />
        Scheduled events
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <p class="text-sm text-muted-foreground">
        Auto-activate a profile at a start time and revert to another at the end — e.g. a Double EXP
        weekend. Each transition announces and restarts.
      </p>

      <p v-if="profiles.length < 2" class="text-sm text-muted-foreground/70">
        Create at least two profiles (the event profile and a “normal” one to revert to) first.
      </p>

      <template v-else>
        <!-- New event -->
        <div class="space-y-2 rounded-lg border p-3">
          <Input v-model="form.name" placeholder="Event name (e.g. Double EXP Weekend)" />
          <div class="grid gap-2 sm:grid-cols-2">
            <label class="space-y-1 text-xs text-muted-foreground">
              Activate profile
              <select v-model="form.profileId" :class="selectClass">
                <option value="" disabled>Select…</option>
                <option v-for="p in profiles" :key="p.id" :value="p.id" class="bg-card">
                  {{ p.name }}
                </option>
              </select>
            </label>
            <label class="space-y-1 text-xs text-muted-foreground">
              Revert to
              <select v-model="form.revertProfileId" :class="selectClass">
                <option value="" disabled>Select…</option>
                <option v-for="p in profiles" :key="p.id" :value="p.id" class="bg-card">
                  {{ p.name }}
                </option>
              </select>
            </label>
            <label class="space-y-1 text-xs text-muted-foreground">
              Starts
              <Input v-model="form.startsAt" type="datetime-local" />
            </label>
            <label class="space-y-1 text-xs text-muted-foreground">
              Ends
              <Input v-model="form.endsAt" type="datetime-local" />
            </label>
          </div>
          <div class="flex items-center gap-3">
            <Button :disabled="createEvent.isPending.value" @click="onCreate">
              <Loader2 v-if="createEvent.isPending.value" class="animate-spin" />
              <Plus v-else />
              Schedule event
            </Button>
            <span v-if="error" class="text-sm text-destructive">{{ error }}</span>
          </div>
        </div>

        <!-- List -->
        <ul v-if="events.length" class="divide-y divide-border rounded-lg border">
          <li v-for="event in events" :key="event.id" class="flex items-center gap-3 p-3">
            <span
              :class="
                cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS[event.status].class)
              "
            >
              {{ STATUS[event.status].label }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ event.name }}</p>
              <p class="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                {{ nameById.get(event.profileId) ?? '—' }}
                <ArrowRight class="size-3" />
                {{ nameById.get(event.revertProfileId) ?? '—' }}
                <span class="text-muted-foreground/60"
                  >· {{ fmt(event.startsAt) }} – {{ fmt(event.endsAt) }}</span
                >
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              :disabled="deleteEvent.isPending.value"
              @click="deleteEvent.mutate(event.id)"
            >
              <Trash2 class="text-muted-foreground" />
            </Button>
          </li>
        </ul>
        <p v-else class="text-sm text-muted-foreground/70">No events scheduled.</p>
      </template>
    </CardContent>
  </Card>
</template>
