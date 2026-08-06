<script setup lang="ts">
import { Card } from '@tsuki/ui'
import type { RosterPlayer } from '@tsuki/types'

defineProps<{ players: RosterPlayer[]; canOpen?: boolean }>()
const emit = defineEmits<{ select: [RosterPlayer] }>()

function dash(v: string | number | null | undefined): string {
  return v == null || v === '' ? '—' : String(v)
}

function lastSeen(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.round(diff / 3_600_000)
  if (h < 1) return 'recently'
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
</script>

<template>
  <Card class="overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left text-xs text-muted-foreground">
            <th class="px-5 py-3 font-medium">Name</th>
            <th class="px-5 py-3 font-medium">Level</th>
            <th class="px-5 py-3 font-medium">Guild</th>
            <th class="px-5 py-3 font-medium">Captures</th>
            <th class="px-5 py-3 font-medium">Paldeck</th>
            <th class="px-5 py-3 text-right font-medium">Last seen</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="player in players"
            :key="player.id"
            class="border-b border-border/60 last:border-0 hover:bg-accent/40"
            :class="canOpen && 'cursor-pointer'"
            @click="canOpen && emit('select', player)"
          >
            <td class="px-5 py-3">
              <span
                class="flex items-center gap-2 font-medium"
                :class="canOpen && 'hover:text-primary'"
              >
                <span class="size-1.5 rounded-full bg-zinc-500" />
                {{ dash(player.name) }}
              </span>
            </td>
            <td class="px-5 py-3 text-muted-foreground">{{ dash(player.level) }}</td>
            <td class="px-5 py-3 text-muted-foreground">{{ dash(player.guildName) }}</td>
            <td class="px-5 py-3 text-muted-foreground">{{ dash(player.captureTotal) }}</td>
            <td class="px-5 py-3 text-muted-foreground">{{ dash(player.paldeckUnlocked) }}</td>
            <td class="px-5 py-3 text-right text-muted-foreground">
              {{ lastSeen(player.lastSeenAt) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
