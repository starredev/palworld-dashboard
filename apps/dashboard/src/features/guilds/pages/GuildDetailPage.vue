<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import {
  ArrowLeft,
  Shield,
  Crown,
  UserMinus,
  Pencil,
  Check,
  X,
  Home,
  PawPrint,
  Users,
} from 'lucide-vue-next'
import { Button, Input, StatusDot } from '@tsuki/ui'
import { useServerStatus } from '@/composables/use-server'
import { usePlayers } from '@/composables/use-players'
import { useSaveStatus } from '@/composables/use-save-editor'
import { useSaveGuilds } from '@/composables/use-save-guilds'
import { useQueueOp } from '@/composables/use-save-batch'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const id = computed(() => String(route.params.id ?? '').toUpperCase())

const auth = useAuthStore()
const saveStatus = useSaveStatus()
const canWrite = computed(() => auth.isAdmin && saveStatus.data.value?.canWrite === true)

const { guilds, query } = useSaveGuilds()
const guild = computed(() => guilds.value.find((g) => g.id === id.value) ?? null)

// Online members, cross-referenced from the live player list.
const status = useServerStatus()
const reachable = computed(() => status.data.value?.reachable === true)
const players = usePlayers(reachable)
const onlineUids = computed(
  () =>
    new Set(
      (players.data.value?.players ?? [])
        .map((p) => (p.playerId ?? '').replace(/[^0-9a-fA-F]/g, '').toLowerCase())
        .filter(Boolean),
    ),
)
const isOnline = (uid: string): boolean =>
  onlineUids.value.has(uid.replace(/[^0-9a-fA-F]/g, '').toLowerCase())

function lastSeen(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

const queue = useQueueOp()

// --- Rename ---
const renaming = ref(false)
const nameInput = ref('')
watch(guild, (g) => {
  if (g && !renaming.value) nameInput.value = g.name
})
function startRename(): void {
  nameInput.value = guild.value?.name ?? ''
  renaming.value = true
}
function saveRename(): void {
  const g = guild.value
  const name = nameInput.value.trim()
  if (!g || !name || name === g.name) {
    renaming.value = false
    return
  }
  queue.mutate(
    { type: 'guildRename', guildId: g.id, label: `Rename guild → “${name}”`, name },
    { onSuccess: () => (renaming.value = false) },
  )
}

// --- Leader / kick ---
function makeLeader(uid: string, memberName: string | null): void {
  const g = guild.value
  if (!g) return
  queue.mutate({
    type: 'guildLeader',
    guildId: g.id,
    memberUid: uid,
    label: `Make ${memberName ?? 'member'} guild leader`,
  })
}
function kick(uid: string, memberName: string | null): void {
  const g = guild.value
  if (!g) return
  queue.mutate({
    type: 'guildKick',
    guildId: g.id,
    memberUid: uid,
    label: `Kick ${memberName ?? 'member'} from ${g.name}`,
  })
}

const stats = computed(() => {
  const g = guild.value
  if (!g) return []
  return [
    { icon: Users, label: `${g.members.length} members` },
    { icon: Home, label: `${g.baseCount} bases` },
    { icon: PawPrint, label: `${g.palCount} pals` },
  ]
})
</script>

<template>
  <section class="space-y-6">
    <RouterLink
      :to="{ name: 'players', query: { tab: 'guilds' } }"
      class="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft class="size-4" /> Guilds
    </RouterLink>

    <div
      v-if="query.isLoading.value"
      class="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"
    >
      Reading the save…
    </div>
    <div
      v-else-if="query.isError.value"
      class="rounded-2xl border border-border bg-card p-8 text-center text-sm text-amber-400"
    >
      Couldn't read guilds from the save: {{ (query.error.value as Error)?.message }}
    </div>
    <div
      v-else-if="!guild"
      class="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"
    >
      Guild not found in the save.
    </div>

    <template v-else>
      <!-- Header -->
      <header class="rounded-2xl border border-border bg-card p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex items-center gap-4">
            <span
              class="grid size-14 shrink-0 place-items-center rounded-2xl bg-muted text-primary"
            >
              <Shield class="size-6" />
            </span>
            <div class="space-y-1.5">
              <div v-if="!renaming" class="flex items-center gap-2">
                <h2 class="text-xl font-semibold tracking-tight">{{ guild.name }}</h2>
                <button
                  v-if="canWrite"
                  class="text-muted-foreground transition-colors hover:text-foreground"
                  title="Rename guild"
                  @click="startRename"
                >
                  <Pencil class="size-3.5" />
                </button>
              </div>
              <div v-else class="flex items-center gap-1.5">
                <Input
                  v-model="nameInput"
                  class="h-8 w-56"
                  maxlength="64"
                  @keyup.enter="saveRename"
                />
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="queue.isPending.value"
                  @click="saveRename"
                >
                  <Check class="size-4" />
                </Button>
                <Button size="sm" variant="ghost" @click="renaming = false">
                  <X class="size-4" />
                </Button>
              </div>
              <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span
                  v-if="guild.solo"
                  class="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-1 font-medium text-sky-400"
                >
                  Personal guild
                </span>
                <span
                  v-for="s in stats"
                  :key="s.label"
                  class="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"
                >
                  <component :is="s.icon" class="size-3.5" />{{ s.label }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <p v-if="!canWrite" class="mt-4 text-xs text-muted-foreground">
          Read-only — save editing is unavailable or you're not an admin.
        </p>
      </header>

      <!-- Members -->
      <div class="rounded-2xl border border-border bg-card p-6">
        <h3 class="mb-3 text-sm font-medium">Members · {{ guild.members.length }}</h3>
        <ul class="divide-y divide-border/60">
          <li
            v-for="m in guild.members"
            :key="m.uid"
            class="flex flex-wrap items-center gap-3 py-3 text-sm"
          >
            <StatusDot :tone="isOnline(m.uid) ? 'online' : 'offline'" />
            <span class="font-medium">{{ m.name ?? m.uid.slice(0, 8) }}</span>
            <span
              v-if="m.isAdmin"
              class="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400"
            >
              <Crown class="size-3" /> Leader
            </span>
            <span class="text-xs text-muted-foreground/70">
              {{ isOnline(m.uid) ? 'Online' : `Seen ${lastSeen(m.lastOnline)}` }}
            </span>

            <div v-if="canWrite && !guild.solo && !m.isAdmin" class="ml-auto flex gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                :disabled="queue.isPending.value"
                @click="makeLeader(m.uid, m.name)"
              >
                <Crown class="size-3.5" /> Make leader
              </Button>
              <Button
                size="sm"
                variant="ghost"
                class="text-red-400 hover:text-red-300"
                :disabled="queue.isPending.value"
                @click="kick(m.uid, m.name)"
              >
                <UserMinus class="size-3.5" /> Kick
              </Button>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
