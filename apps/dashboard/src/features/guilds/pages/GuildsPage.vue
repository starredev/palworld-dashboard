<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { Shield, Users, Home, PawPrint } from 'lucide-vue-next'
import { Card, CardHeader, CardContent, Skeleton, StatusDot } from '@tsuki/ui'
import { api } from '@/lib/api'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'

const { data, isLoading } = useQuery({
  queryKey: ['guilds'],
  queryFn: () => api.getGuilds(),
  refetchInterval: 30_000,
})
const guilds = computed(() => data.value?.guilds ?? [])
const unavailable = computed(() => data.value && !data.value.available)

function lastSeen(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'
}
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-1">
      <h2 class="text-xl font-semibold tracking-tight">Guilds</h2>
      <p class="text-sm text-muted-foreground">
        Guilds, members and base Pals from your save data.
      </p>
    </header>

    <div v-if="isLoading" class="space-y-3">
      <Skeleton v-for="n in 2" :key="n" class="h-40 w-full" />
    </div>

    <PagePlaceholder
      v-else-if="unavailable"
      :icon="Shield"
      title="Guild data unavailable"
      description="Point the API at your live-map GameData endpoint (set GAMEDATA_URL) to see guilds and Pals."
    />
    <PagePlaceholder
      v-else-if="guilds.length === 0"
      :icon="Shield"
      title="No guilds yet"
      description="Guilds will appear here once players form them."
    />

    <div v-else class="space-y-4">
      <Card v-for="guild in guilds" :key="guild.key">
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
  </section>
</template>
