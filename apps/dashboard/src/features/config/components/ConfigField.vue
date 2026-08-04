<script setup lang="ts">
import { ref, watch } from 'vue'
import { Input, cn } from '@tsuki/ui'
import type { ConfigField } from '../fields'
import { PLATFORM_OPTIONS } from '../fields'
import { unquote, quote, parsePlatforms, serializePlatforms } from '../serialize'

defineProps<{ field: ConfigField }>()
const raw = defineModel<string>({ required: true })

// text / password
function text(v?: string): string {
  return unquote(v ?? '')
}

// number — keep a local display so typing decimals doesn't fight formatting
const numDisplay = ref(numFmt(raw.value))
watch(
  () => raw.value,
  (v) => {
    if (Number(v) !== Number(numDisplay.value)) numDisplay.value = numFmt(v)
  },
)
watch(numDisplay, (v) => (raw.value = v))
function numFmt(v?: string): string {
  const n = Number(v)
  return v == null || v === '' || !Number.isFinite(n) ? '' : String(n)
}

const on = () => raw.value === 'True'
const platforms = () => parsePlatforms(raw.value ?? '')
function togglePlatform(p: string): void {
  const cur = platforms()
  raw.value = serializePlatforms(cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p])
}
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex items-center justify-between gap-3">
      <label class="text-sm font-medium">{{ field.label }}</label>

      <!-- bool toggle -->
      <button
        v-if="field.type === 'bool'"
        type="button"
        role="switch"
        :aria-checked="on()"
        :class="
          cn(
            'relative h-6 w-11 shrink-0 rounded-full transition-colors',
            on() ? 'bg-primary' : 'bg-muted',
          )
        "
        @click="raw = on() ? 'False' : 'True'"
      >
        <span
          :class="
            cn(
              'absolute top-0.5 size-5 rounded-full bg-background transition-transform',
              on() ? 'translate-x-[22px]' : 'translate-x-0.5',
            )
          "
        />
      </button>
    </div>

    <!-- number with slider -->
    <div
      v-if="(field.type === 'float' || field.type === 'int') && field.slider"
      class="flex items-center gap-3"
    >
      <input
        v-model="numDisplay"
        type="range"
        :min="field.slider.min"
        :max="field.slider.max"
        :step="field.slider.step"
        class="h-2 flex-1 cursor-pointer accent-primary"
      />
      <Input v-model="numDisplay" type="number" class="w-20 shrink-0" />
    </div>

    <!-- plain number -->
    <Input
      v-else-if="field.type === 'float' || field.type === 'int'"
      v-model="numDisplay"
      type="number"
    />

    <!-- text / password -->
    <Input
      v-else-if="field.type === 'text' || field.type === 'password'"
      :model-value="text(raw)"
      :type="field.type === 'password' ? 'password' : 'text'"
      @update:model-value="(v) => (raw = quote(v ?? ''))"
    />

    <!-- enum -->
    <select
      v-else-if="field.type === 'enum'"
      v-model="raw"
      class="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option v-for="opt in field.options" :key="opt" :value="opt" class="bg-card">
        {{ opt }}
      </option>
    </select>

    <!-- platforms -->
    <div v-else-if="field.type === 'platforms'" class="flex flex-wrap gap-1.5">
      <button
        v-for="p in PLATFORM_OPTIONS"
        :key="p"
        type="button"
        :class="
          cn(
            'rounded-lg border px-3 py-1 text-xs font-medium transition-colors',
            platforms().includes(p)
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:bg-accent',
          )
        "
        @click="togglePlatform(p)"
      >
        {{ p }}
      </button>
    </div>

    <p v-if="field.help" class="text-xs text-muted-foreground/80">{{ field.help }}</p>
  </div>
</template>
