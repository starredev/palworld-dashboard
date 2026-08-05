<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { RotateCw, DownloadCloud, Loader2, Check, TriangleAlert } from 'lucide-vue-next'
import { Card, CardContent, Button, ConfirmDialog } from '@tsuki/ui'
import { api } from '@/lib/api'

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

// Writing the ini and force-restarting is one atomic action: a plain save would
// be silently reverted by the game's graceful-shutdown rewrite.
const apply = useMutation({ mutationFn: () => api.applyGameConfig(props.body) })
const applied = ref(false)
const applyOpen = ref(false)
function confirmApply(): void {
  apply.mutate(undefined, {
    onSuccess: () => {
      applyOpen.value = false
      applied.value = true
      setTimeout(() => (applied.value = false), 4000)
    },
  })
}
</script>

<template>
  <Card v-if="config.data.value?.available">
    <CardContent class="space-y-3 p-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="mr-auto text-sm text-muted-foreground">
          Live server config detected — edit above, then Save &amp; restart to apply.
        </span>
        <Button
          variant="outline"
          @click="config.data.value?.content && emit('load', config.data.value.content)"
        >
          <DownloadCloud />
          Reload
        </Button>
        <Button variant="destructive" @click="applyOpen = true">
          <Loader2 v-if="apply.isPending.value" class="animate-spin" />
          <Check v-else-if="applied" />
          <RotateCw v-else />
          {{ applied ? 'Applied' : 'Save & restart' }}
        </Button>
      </div>
      <p
        v-if="apply.error.value"
        class="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        Apply failed: {{ apply.error.value.message }}. The API may not have write access to
        PalWorldSettings.ini — check the api logs.
      </p>
      <p class="flex items-start gap-2 text-xs text-muted-foreground/80">
        <TriangleAlert class="mt-0.5 size-3.5 shrink-0" />
        <span>
          Edits are written and applied with a <span class="font-mono">force-restart</span> — a
          normal shutdown would let the game overwrite the file from memory. If your server image
          regenerates settings from environment variables on boot (e.g. palworld-server-docker),
          also set <span class="font-mono">DISABLE_GENERATE_SETTINGS=true</span> so this file stays
          the source of truth.
        </span>
      </p>
    </CardContent>

    <ConfirmDialog
      v-model:open="applyOpen"
      title="Save & restart the server?"
      description="Your changes are written to PalWorldSettings.ini and the server is force-restarted so they take effect. Players disconnect for the short time it takes to come back up. This is the only way edits reliably survive — a graceful shutdown would overwrite them."
      tone="destructive"
      confirm-label="Save & restart"
      :loading="apply.isPending.value"
      @confirm="confirmApply"
    />
  </Card>
</template>
