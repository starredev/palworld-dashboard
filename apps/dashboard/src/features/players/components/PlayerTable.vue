<script setup lang="ts">
import type { PalPlayer } from '@tsuki/types'
import { UserX, Ban, ChevronUp, ChevronDown } from 'lucide-vue-next'
import { Card, Button } from '@tsuki/ui'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

export type SortKey = 'name' | 'level' | 'ping'

defineProps<{
  players: PalPlayer[]
  busyId?: string | null
  sortKey?: SortKey
  sortDir?: 'asc' | 'desc'
}>()
defineEmits<{ kick: [player: PalPlayer]; ban: [player: PalPlayer]; sort: [key: SortKey] }>()

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'level', label: 'Level' },
  { key: 'ping', label: 'Ping' },
]

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
            <th v-for="col in COLUMNS" :key="col.key" class="px-5 py-3 font-medium">
              <button
                class="flex items-center gap-1 hover:text-foreground"
                @click="$emit('sort', col.key)"
              >
                {{ col.label }}
                <ChevronUp v-if="sortKey === col.key && sortDir === 'asc'" class="size-3" />
                <ChevronDown v-else-if="sortKey === col.key && sortDir === 'desc'" class="size-3" />
              </button>
            </th>
            <th class="px-5 py-3 font-medium">Player ID</th>
            <th v-if="auth.isAdmin" class="px-5 py-3 text-right font-medium">Actions</th>
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
            <td v-if="auth.isAdmin" class="px-5 py-3">
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
