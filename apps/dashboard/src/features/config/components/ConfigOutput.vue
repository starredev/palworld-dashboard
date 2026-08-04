<script setup lang="ts">
import { ref } from 'vue'
import { Copy, Download, Check, ClipboardPaste } from 'lucide-vue-next'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@tsuki/ui'

const props = defineProps<{ ini: string; changed: number }>()
const emit = defineEmits<{ import: [text: string] }>()

const copied = ref(false)
async function copy(): Promise<void> {
  await navigator.clipboard.writeText(props.ini)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function download(): void {
  const url = URL.createObjectURL(new Blob([props.ini], { type: 'text/plain' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'PalWorldSettings.ini'
  a.click()
  URL.revokeObjectURL(url)
}

const importing = ref(false)
const draft = ref('')
function doImport(): void {
  if (draft.value.trim()) emit('import', draft.value)
  importing.value = false
  draft.value = ''
}
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between">
      <CardTitle class="text-foreground">PalWorldSettings.ini</CardTitle>
      <span class="text-xs text-muted-foreground">{{ changed }} changed</span>
    </CardHeader>
    <CardContent class="space-y-3">
      <div class="flex flex-wrap gap-2">
        <Button size="sm" @click="copy">
          <Check v-if="copied" />
          <Copy v-else />
          {{ copied ? 'Copied' : 'Copy' }}
        </Button>
        <Button size="sm" variant="outline" @click="download">
          <Download />
          Download
        </Button>
        <Button size="sm" variant="outline" @click="importing = !importing">
          <ClipboardPaste />
          Import
        </Button>
      </div>

      <div v-if="importing" class="space-y-2">
        <textarea
          v-model="draft"
          rows="4"
          placeholder="Paste an existing OptionSettings=(…) line or full .ini"
          class="w-full rounded-lg border border-input bg-transparent p-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button size="sm" :disabled="!draft.trim()" @click="doImport">Apply import</Button>
      </div>

      <pre
        class="max-h-[50vh] overflow-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground"
      ><code>{{ ini }}</code></pre>
    </CardContent>
  </Card>
</template>
