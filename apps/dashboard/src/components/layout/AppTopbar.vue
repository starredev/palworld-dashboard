<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { Menu } from 'lucide-vue-next'
import { StatusDot } from '@tsuki/ui'
import { api } from '@/lib/api'
import { useHealth } from '@/composables/use-health'

defineEmits<{ toggleSidebar: [] }>()
defineProps<{ live?: boolean }>()

const route = useRoute()
const title = computed(() => (route.meta.title as string | undefined) ?? 'Overview')

const config = useQuery({ queryKey: ['appConfig'], queryFn: () => api.getConfig() })
const headerImage = computed(() => config.data.value?.headerImageUrl ?? null)

const { data, isLoading, isError } = useHealth()

const connection = computed(() => {
  if (isLoading.value) return { tone: 'pending' as const, label: 'Connecting…' }
  if (isError.value || !data.value) return { tone: 'offline' as const, label: 'API offline' }
  return { tone: 'online' as const, label: 'API online' }
})
</script>

<template>
  <header
    class="relative flex items-center gap-3 overflow-hidden border-b border-border px-4 lg:px-6"
    :class="headerImage ? 'h-24 sm:h-28' : 'h-14'"
  >
    <!-- Branded banner image, or a subtle fallback gradient -->
    <div
      v-if="headerImage"
      class="absolute inset-0 bg-cover bg-center"
      :style="{ backgroundImage: `url('${headerImage}')` }"
    />
    <div v-else class="absolute inset-0 bg-card/30" />
    <!-- Legibility scrim so overlaid controls always read -->
    <div
      v-if="headerImage"
      class="absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-black/50"
    />

    <button
      class="relative z-10 grid size-9 place-items-center rounded-lg text-foreground/80 hover:bg-white/10 hover:text-white lg:hidden"
      :class="headerImage ? 'text-white/80' : 'text-muted-foreground'"
      aria-label="Toggle navigation"
      @click="$emit('toggleSidebar')"
    >
      <Menu class="size-5" />
    </button>

    <h1 v-if="!headerImage" class="relative z-10 text-sm font-semibold tracking-tight">
      {{ title }}
    </h1>

    <div class="relative z-10 ml-auto flex items-center gap-2">
      <div
        v-if="live"
        class="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 backdrop-blur-sm"
      >
        <StatusDot tone="online" pulse />
        <span class="text-xs font-medium text-emerald-200">Live</span>
      </div>
      <div
        class="flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-sm"
        :class="headerImage ? 'border-white/20 bg-black/30' : 'border-border'"
      >
        <StatusDot :tone="connection.tone" :pulse="connection.tone === 'online'" />
        <span class="text-xs" :class="headerImage ? 'text-white/85' : 'text-muted-foreground'">
          {{ connection.label }}
        </span>
      </div>
    </div>
  </header>
</template>
