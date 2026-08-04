<script setup lang="ts">
import { computed, ref } from 'vue'
import { Megaphone, Save, Power, Loader2 } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, ConfirmDialog } from '@tsuki/ui'
import { useServerCommands } from '@/composables/use-commands'

const { broadcast, save, shutdown } = useServerCommands()

const message = ref('')
function sendBroadcast(): void {
  if (!message.value.trim()) return
  broadcast.mutate(message.value, { onSuccess: () => (message.value = '') })
}

const shutdownOpen = ref(false)
const shutdownSeconds = ref('30')
const shutdownMessage = ref('The server is shutting down')
function confirmShutdown(): void {
  shutdown.mutate(
    { seconds: Number(shutdownSeconds.value) || 30, message: shutdownMessage.value },
    { onSuccess: () => (shutdownOpen.value = false) },
  )
}

const saving = computed(() => save.isPending.value)
const broadcasting = computed(() => broadcast.isPending.value)
</script>

<template>
  <Card>
    <CardHeader><CardTitle>Server controls</CardTitle></CardHeader>
    <CardContent class="space-y-4">
      <form class="flex flex-col gap-2 sm:flex-row" @submit.prevent="sendBroadcast">
        <Input v-model="message" placeholder="Broadcast a message to all players…" />
        <Button type="submit" :disabled="broadcasting || !message.trim()">
          <Loader2 v-if="broadcasting" class="animate-spin" />
          <Megaphone v-else />
          Broadcast
        </Button>
      </form>

      <div class="flex flex-wrap gap-2">
        <Button variant="outline" :disabled="saving" @click="save.mutate()">
          <Loader2 v-if="saving" class="animate-spin" />
          <Save v-else />
          Save world
        </Button>
        <Button variant="destructive" @click="shutdownOpen = true">
          <Power />
          Shutdown…
        </Button>
      </div>
    </CardContent>

    <ConfirmDialog
      v-model:open="shutdownOpen"
      title="Shut down the server?"
      description="All players will be disconnected after the delay below."
      tone="destructive"
      confirm-label="Shut down"
      :loading="shutdown.isPending.value"
      @confirm="confirmShutdown"
    >
      <div class="space-y-3 text-left">
        <div>
          <label class="mb-1 block text-xs text-muted-foreground">Delay (seconds)</label>
          <Input v-model="shutdownSeconds" type="number" />
        </div>
        <div>
          <label class="mb-1 block text-xs text-muted-foreground">Message to players</label>
          <Input v-model="shutdownMessage" />
        </div>
      </div>
    </ConfirmDialog>
  </Card>
</template>
