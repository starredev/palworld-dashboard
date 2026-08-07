<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { RouterLink } from 'vue-router'
import { Shield, Users, Home, PawPrint, ChevronRight, Crown } from 'lucide-vue-next'
import { Card, CardHeader, CardContent, Skeleton, StatusDot } from '@tsuki/ui'
import { api } from '@/lib/api'
import { useSaveGuilds } from '@/composables/use-save-guilds'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'

// Admins with save access get the editable, save-backed list (clickable → detail).
const { guilds: saveGuilds, enabled: saveEnabled, query: saveQuery } = useSaveGuilds()

// Everyone else gets the read-only live-map overview.
const live = useQuery({
  queryKey: ['guilds'],
  queryFn: () => api.getGuilds(),
  refetchInterval: 30_000,
  enabled: computed(() => !saveEnabled.value),
})
const liveGuilds = computed(() => live.data.value?.guilds ?? [])
const liveUnavailable = computed(() => live.data.value && !live.data.value.available)

const useSave = computed(() => saveEnabled.value)
const isLoading = computed(() => (useSave.value ? saveQuery.isLoading.value : live.isLoading.value))

function lastSeen(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'
}
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-1">
      <h2 class="text-xl font-semibold tracking-tight">Guilds</h2>
      <p class="text-sm text-muted-foreground">
        {{
          useSave
            ? 'Guilds from your save — click one to rename it, change the leader or remove members.'
            : 'Guilds, members and base Pals from your save data.'
        }}
      </p>
    </header>

    <div v-if="isLoading" class="space-y-3">
      <Skeleton v-for="n in 2" :key="n" class="h-40 w-full" />
    </div>

    <!-- Admin: editable, save-backed cards -->
    <template v-else-if="useSave">
      <div
        v-if="saveQuery.isError.value"
        class="rounded-2xl border border-border bg-card p-6 text-sm text-amber-400"
      >
        Couldn't read guilds from the save: {{ (saveQuery.error.value as Error)?.message }}
      </div>
      <PagePlaceholder
        v-else-if="saveGuilds.length === 0"
        :icon="Shield"
        title="No guilds yet"
        description="Guilds will appear here once players form them."
      />
      <div v-else class="space-y-4">
        <RouterLink
          v-for="guild in saveGuilds"
          :key="guild.id"
          :to="{ name: 'guild', params: { id: guild.id } }"
          class="block"
        >
          <Card class="transition-colors hover:border-primary/40">
            <CardHeader class="flex-row flex-wrap items-center justify-between gap-3">
              <h3 class="flex items-center gap-2 text-base font-semibold tracking-tight">
                {{ guild.name }}
                <span
                  v-if="guild.solo"
                  class="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-400"
                >
                  Personal
                </span>
              </h3>
              <div class="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"
                >
                  <Users class="size-3.5" />{{ guild.members.length }}
                </span>
                <span
                  class="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"
                >
                  <Home class="size-3.5" />{{ guild.baseCount }}
                </span>
                <span
                  class="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"
                >
                  <PawPrint class="size-3.5" />{{ guild.palCount }}
                </span>
                <ChevronRight class="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <ul class="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                <li
                  v-for="m in guild.members"
                  :key="m.uid"
                  class="inline-flex items-center gap-1.5 text-muted-foreground"
                >
                  <Crown v-if="m.isAdmin" class="size-3 text-amber-400" />
                  {{ m.name ?? m.uid.slice(0, 8) }}
                </li>
              </ul>
            </CardContent>
          </Card>
        </RouterLink>
      </div>
    </template>

    <!-- Non-admin: read-only live overview -->
    <template v-else>
      <PagePlaceholder
        v-if="liveUnavailable"
        :icon="Shield"
        title="Guild data unavailable"
        description="Point the API at your live-map GameData endpoint (set GAMEDATA_URL) to see guilds and Pals."
      />
      <PagePlaceholder
        v-else-if="liveGuilds.length === 0"
        :icon="Shield"
        title="No guilds yet"
        description="Guilds will appear here once players form them."
      />
      <div v-else class="space-y-4">
        <Card v-for="guild in liveGuilds" :key="guild.key">
          <CardHeader class="flex-row flex-wrap items-center justify-between gap-3">
            <h3 class="text-base font-semibold tracking-tight">{{ guild.name }}</h3>
            <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span
                class="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"
              >
                <Users class="size-3.5" />{{ guild.memberCount }} members
              </span>
              <span
                class="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"
              >
                <Home class="size-3.5" />{{ guild.baseCount }} bases
              </span>
              <span
                class="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"
              >
                <PawPrint class="size-3.5" />{{ guild.palCount }} pals
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ul class="divide-y divide-border/60">
              <li
                v-for="member in guild.members"
                :key="member.id"
                class="flex items-center gap-3 py-2.5 text-sm"
              >
                <StatusDot :tone="member.online ? 'online' : 'offline'" />
                <span class="font-medium">{{ member.name }}</span>
                <span class="text-muted-foreground">Lv {{ member.level ?? '—' }}</span>
                <span class="ml-auto text-xs text-muted-foreground/70">
                  {{ member.online ? 'Online' : `Seen ${lastSeen(member.lastSeenAt)}` }}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </template>
  </section>
</template>
