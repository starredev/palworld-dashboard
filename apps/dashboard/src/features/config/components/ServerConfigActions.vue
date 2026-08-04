<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { Save, RotateCw, DownloadCloud, Loader2, Check } from 'lucide-vue-next'
import { Card, CardContent, Button, ConfirmDialog } from '@tsuki/ui'
import { api } from '@/lib/api'
import { useServerCommands } from '@/composables/use-commands'

const props = defineProps<{ body: string }>()
const emit = defineEmits<{ load: [content: string] }>()

const config = useQuery({ queryKey: ['gameConfig'], queryFn: () => api.getGameConfig() })

// Load the live config into the editor once, when first detected.
const loadedOnce = ref(false)
watch(
  () => config.data.value,
  (data) => {
    if (!loadedOnce.value && data?.available && data.content) {
      loadedOnce.value = true
      emit('load', data.content)
    }
  },
  { immediate: true },
)

const save = useMutation({ mutationFn: () => api.saveGameConfig(props.body) })
const saved = ref(false)
function onSave(): void {
  save.mutate(undefined, {
    onSuccess: () => {
      saved.value = true
      setTimeout(() => (saved.value = false), 2000)
    },
  })
}

const { shutdown } = useServerCommands()
const restartOpen = ref(false)
function confirmRestart(): void {
  shutdown.mutate(
    { seconds: 5, message: 'Restarting to apply new settings' },
    { onSuccess: () => (restartOpen.value = false) },
  )
}
</script>

<template>
  <Card v-if="config.data.value?.available">
    <CardContent class="flex flex-wrap items-center gap-2 p-4">
      <span class="mr-auto text-sm text-muted-foreground">
        Live server config detected — edit above, save, then restart to apply.
      </span>
      <Button
        variant="outline"
        @click="config.data.value?.content && emit('load', config.data.value.content)"
      >
        <DownloadCloud />
        Reload
      </Button>
      <Button :disabled="save.isPending.value" @click="onSave">
        <Loader2 v-if="save.isPending.value" class="animate-spin" />
        <Check v-else-if="saved" />
        <Save v-else />
        {{ saved ? 'Saved' : 'Save to server' }}
      </Button>
      <Button variant="destructive" @click="restartOpen = true">
        <RotateCw />
        Restart
      </Button>
    </CardContent>

    <ConfirmDialog
      v-model:open="restartOpen"
      title="Restart the server?"
      description="The server shuts down and your restart policy brings it back with the saved config. Players disconnect briefly."
      tone="destructive"
      confirm-label="Restart"
      :loading="shutdown.isPending.value"
      @confirm="confirmRestart"
    />
  </Card>
</template>
