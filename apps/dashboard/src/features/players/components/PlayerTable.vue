<script setup lang="ts">
import type { PalPlayer } from '@tsuki/types'
import { UserX, Ban } from 'lucide-vue-next'
import { Card, Button } from '@tsuki/ui'

defineProps<{ players: PalPlayer[]; busyId?: string | null }>()
defineEmits<{ kick: [player: PalPlayer]; ban: [player: PalPlayer] }>()

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
            <th class="px-5 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(player, i) in players"
            :key="player.userId ?? player.playerId ?? `${player.name}-${i}`"
            class="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40"
          >
            <td class="px-5 py-3 font-medium">{{ dash(player.name) }}</td>
            <td class="px-5 py-3 text-muted-foreground">{{ dash(player.level) }}</td>
            <td class="px-5 py-3 text-muted-foreground">
              {{ player.ping != null ? `${Math.round(player.ping)} ms` : '—' }}
            </td>
            <td class="px-5 py-3 font-mono text-xs text-muted-foreground">
              {{ dash(player.playerId ?? player.userId) }}
            </td>
            <td class="px-5 py-3">
              <div class="flex justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  :disabled="!player.userId || busyId === player.userId"
                  @click="$emit('kick', player)"
                >
                  <UserX />
                  Kick
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  class="text-destructive hover:text-destructive"
                  :disabled="!player.userId || busyId === player.userId"
                  @click="$emit('ban', player)"
                >
                  <Ban />
                  Ban
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
