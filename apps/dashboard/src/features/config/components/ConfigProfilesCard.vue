<script setup lang="ts">
import { ref } from 'vue'
import { Rocket, Trash2, Loader2, Save, Megaphone } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, ConfirmDialog } from '@tsuki/ui'
import type { ConfigProfile } from '@tsuki/types'
import { useConfigProfiles } from '../use-config-profiles'

// The current editor body, so "save current settings" captures a live snapshot.
const props = defineProps<{ body: string }>()

const { query, saveProfile, deleteProfile, applyProfile } = useConfigProfiles()

const name = ref('')
const announce = ref('')
function onSave(): void {
  if (!name.value.trim()) return
  saveProfile.mutate(
    { name: name.value.trim(), body: props.body, announce: announce.value.trim() },
    {
      onSuccess: () => {
        name.value = ''
        announce.value = ''
      },
    },
  )
}

const applyTarget = ref<ConfigProfile | null>(null)
function confirmApply(): void {
  if (!applyTarget.value) return
  applyProfile.mutate(applyTarget.value.id, { onSettled: () => (applyTarget.value = null) })
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-foreground">
        <Rocket class="size-4 text-muted-foreground" />
        Config profiles
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <p class="text-sm text-muted-foreground">
        Save the settings above as a named profile — apply it any time with one click (writes the
        ini, broadcasts your message, and restarts).
      </p>

      <!-- Save current -->
      <div class="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
        <Input v-model="name" placeholder="Profile name (e.g. Double EXP)" />
        <Input v-model="announce" placeholder="Announcement (optional)" />
        <Button :disabled="!name.trim() || saveProfile.isPending.value" @click="onSave">
          <Loader2 v-if="saveProfile.isPending.value" class="animate-spin" />
          <Save v-else />
          Save profile
        </Button>
      </div>

      <!-- List -->
      <ul v-if="query.data.value?.profiles.length" class="divide-y divide-border rounded-lg border">
        <li
          v-for="profile in query.data.value.profiles"
          :key="profile.id"
          class="flex items-center gap-3 p-3"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ profile.name }}</p>
            <p
              v-if="profile.announce"
              class="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground"
            >
              <Megaphone class="size-3 shrink-0" />
              {{ profile.announce }}
            </p>
          </div>
          <Button size="sm" variant="outline" @click="applyTarget = profile">
            <Rocket />
            Apply
          </Button>
          <Button
            size="sm"
            variant="ghost"
            :disabled="deleteProfile.isPending.value"
            @click="deleteProfile.mutate(profile.id)"
          >
            <Trash2 class="text-muted-foreground" />
          </Button>
        </li>
      </ul>
      <p v-else class="text-sm text-muted-foreground/70">No profiles yet.</p>
    </CardContent>

    <ConfirmDialog
      :open="applyTarget !== null"
      :title="`Apply “${applyTarget?.name}”?`"
      description="The server force-restarts to apply this profile. Players disconnect briefly and reconnect with the new settings."
      tone="destructive"
      confirm-label="Apply & restart"
      :loading="applyProfile.isPending.value"
      @confirm="confirmApply"
      @update:open="(v: boolean) => !v && (applyTarget = null)"
    />
  </Card>
</template>
