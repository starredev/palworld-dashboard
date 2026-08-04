<script setup lang="ts">
import type { PalPlayer } from '@tsuki/types'
import { Card } from '@tsuki/ui'

defineProps<{ players: PalPlayer[] }>()

function dash(value: string | number | null | undefined): string {
  return value == null || value === '' ? '—' : String(value)
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
            <th class="px-5 py-3 font-medium">Ping</th>
            <th class="px-5 py-3 font-medium">Player ID</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(player, i) in players"
            :key="player.userId ?? player.playerId ?? `${player.name}-${i}`"
            class="border-b border-border/60 last:border-0 transition-colors hover:bg-accent/40"
          >
            <td class="px-5 py-3 font-medium">{{ dash(player.name) }}</td>
            <td class="px-5 py-3 text-muted-foreground">{{ dash(player.level) }}</td>
            <td class="px-5 py-3 text-muted-foreground">
              {{ player.ping != null ? `${Math.round(player.ping)} ms` : '—' }}
            </td>
            <td class="px-5 py-3 font-mono text-xs text-muted-foreground">
              {{ dash(player.playerId ?? player.userId) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
