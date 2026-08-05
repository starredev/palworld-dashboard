<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { X, UserX, Ban, Copy, Check, MapPin, Navigation } from 'lucide-vue-next'
import { Button } from '@tsuki/ui'
import type { PalPlayer } from '@tsuki/types'
import { useAuthStore } from '@/stores/auth'

defineProps<{ player: PalPlayer | null; busy?: boolean; canTeleport?: boolean }>()
const emit = defineEmits<{
  close: []
  kick: [PalPlayer]
  ban: [PalPlayer]
  teleport: [PalPlayer]
}>()

const auth = useAuthStore()
const copied = ref('')
function copy(value: string): void {
  void navigator.clipboard?.writeText(value)
  copied.value = value
  setTimeout(() => (copied.value = ''), 1500)
}
function dash(v: string | number | null | undefined): string {
  return v == null || v === '' ? '—' : String(v)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="player" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />
        <div
          role="dialog"
          aria-modal="true"
          class="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        >
          <button
            class="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            aria-label="Close"
            @click="emit('close')"
          >
            <X class="size-4" />
          </button>

          <div class="flex items-center gap-3">
            <span
              class="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-base font-semibold uppercase"
            >
              {{ player.name.charAt(0) }}
            </span>
            <div>
              <h2 class="text-base font-semibold tracking-tight">{{ player.name }}</h2>
              <p class="text-xs text-muted-foreground">
                Level {{ dash(player.level) }} ·
                {{ player.ping != null ? `${Math.round(player.ping)} ms` : '—' }} ping
              </p>
            </div>
          </div>

          <dl class="mt-5 space-y-3 text-sm">
            <div
              v-for="row in [
                { label: 'Player ID', value: player.playerId },
                { label: 'User ID (platform)', value: player.userId },
              ]"
              :key="row.label"
              class="flex items-center justify-between gap-3"
            >
              <dt class="text-muted-foreground">{{ row.label }}</dt>
              <dd class="flex min-w-0 items-center gap-1.5 font-mono text-xs">
                <span class="truncate">{{ dash(row.value) }}</span>
                <button
                  v-if="row.value"
                  class="shrink-0 text-muted-foreground hover:text-foreground"
                  @click="copy(row.value)"
                >
                  <Check v-if="copied === row.value" class="size-3.5 text-emerald-400" />
                  <Copy v-else class="size-3.5" />
                </button>
              </dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-muted-foreground">Location</dt>
              <dd class="flex items-center gap-2 text-xs">
                <span class="font-mono">
                  {{
                    player.location
                      ? `${Math.round(player.location.x)}, ${Math.round(player.location.y)}`
                      : '—'
                  }}
                </span>
                <RouterLink
                  v-if="player.location"
                  to="/map"
                  class="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <MapPin class="size-3.5" /> Map
                </RouterLink>
              </dd>
            </div>
          </dl>

          <div v-if="auth.isAdmin" class="mt-6 flex justify-end gap-2">
            <Button
              v-if="canTeleport"
              variant="outline"
              size="sm"
              :disabled="!player.playerId || busy"
              class="mr-auto"
              @click="emit('teleport', player)"
            >
              <Navigation /> Teleport
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="!player.userId || busy"
              @click="emit('kick', player)"
            >
              <UserX /> Kick
            </Button>
            <Button
              variant="destructive"
              size="sm"
              :disabled="!player.userId || busy"
              @click="emit('ban', player)"
            >
              <Ban /> Ban
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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
