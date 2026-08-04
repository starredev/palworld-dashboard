<script setup lang="ts">
import { computed } from 'vue'
import { LogIn, LogOut, Wifi, WifiOff, Activity } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardContent } from '@tsuki/ui'
import { useEventsStore } from '@/stores/events'

const store = useEventsStore()
const events = computed(() => store.events.slice(0, 12))

const ICONS = { join: LogIn, leave: LogOut, online: Wifi, offline: WifiOff }
const TONES = {
  join: 'text-emerald-400',
  leave: 'text-muted-foreground',
  online: 'text-emerald-400',
  offline: 'text-red-400',
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <Card>
    <CardHeader><CardTitle class="text-foreground">Recent activity</CardTitle></CardHeader>
    <CardContent>
      <div
        v-if="events.length === 0"
        class="flex items-center gap-2 py-6 text-sm text-muted-foreground"
      >
        <Activity class="size-4" />
        Waiting for activity…
      </div>
      <ul v-else class="space-y-2.5">
        <li v-for="event in events" :key="event.id" class="flex items-center gap-3 text-sm">
          <component :is="ICONS[event.kind]" :class="['size-4 shrink-0', TONES[event.kind]]" />
          <span class="min-w-0 flex-1 truncate">{{ event.message }}</span>
          <span class="shrink-0 text-xs text-muted-foreground/70">{{ time(event.at) }}</span>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
