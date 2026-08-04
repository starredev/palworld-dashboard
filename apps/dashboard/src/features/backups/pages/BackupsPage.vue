<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Archive,
  Plus,
  Download,
  RotateCcw,
  Trash2,
  Loader2,
  HardDriveDownload,
} from 'lucide-vue-next'
import type { BackupEntry } from '@tsuki/types'
import { formatBytes } from '@tsuki/shared'
import { Card, Button, Skeleton, ConfirmDialog } from '@tsuki/ui'
import { api } from '@/lib/api'
import { useBackups } from '@/composables/use-backups'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'

const { query, create, restore, remove } = useBackups()

const available = computed(() => query.data.value?.available === true)
const backups = computed(() => query.data.value?.backups ?? [])
const unavailable = computed(() => query.data.value && !query.data.value.available)
const schedule = computed(() => query.data.value?.schedule ?? null)

const restoreTarget = ref<BackupEntry | null>(null)
const deleteTarget = ref<BackupEntry | null>(null)

function date(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}
function confirmRestore(): void {
  const name = restoreTarget.value?.name
  if (name) restore.mutate(name, { onSettled: () => (restoreTarget.value = null) })
}
function confirmDelete(): void {
  const name = deleteTarget.value?.name
  if (name) remove.mutate(name, { onSettled: () => (deleteTarget.value = null) })
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div class="space-y-1">
        <h2 class="text-xl font-semibold tracking-tight">Backups</h2>
        <p class="text-sm text-muted-foreground">
          Snapshot, download and restore your world saves.
          <span v-if="schedule" class="text-foreground">
            Auto every {{ schedule.hours }}h, keeping {{ schedule.retention }}.
          </span>
        </p>
      </div>
      <Button v-if="available" :disabled="create.isPending.value" @click="create.mutate()">
        <Loader2 v-if="create.isPending.value" class="animate-spin" />
        <Plus v-else />
        Create backup
      </Button>
    </header>

    <div v-if="query.isLoading.value" class="space-y-2">
      <Skeleton v-for="n in 3" :key="n" class="h-14 w-full" />
    </div>

    <PagePlaceholder
      v-else-if="unavailable"
      :icon="HardDriveDownload"
      title="Backups unavailable"
      description="Mount your Palworld data dir into the API (set PALWORLD_DATA_DIR) to snapshot and restore saves."
    />

    <PagePlaceholder
      v-else-if="backups.length === 0"
      :icon="Archive"
      title="No backups yet"
      description="Create your first backup to snapshot the current world."
    />

    <Card v-else class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-left text-xs text-muted-foreground">
              <th class="px-5 py-3 font-medium">Name</th>
              <th class="px-5 py-3 font-medium">Size</th>
              <th class="px-5 py-3 font-medium">Created</th>
              <th class="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="backup in backups"
              :key="backup.name"
              class="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40"
            >
              <td class="px-5 py-3 font-mono text-xs">{{ backup.name }}</td>
              <td class="px-5 py-3 text-muted-foreground">{{ formatBytes(backup.size) }}</td>
              <td class="px-5 py-3 text-muted-foreground">{{ date(backup.createdAt) }}</td>
              <td class="px-5 py-3">
                <div class="flex justify-end gap-1.5">
                  <a :href="api.backupDownloadUrl(backup.name)" :download="backup.name">
                    <Button size="sm" variant="ghost"><Download />Download</Button>
                  </a>
                  <Button size="sm" variant="ghost" @click="restoreTarget = backup">
                    <RotateCcw />Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    class="text-destructive hover:text-destructive"
                    @click="deleteTarget = backup"
                  >
                    <Trash2 />Delete
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <ConfirmDialog
      :open="restoreTarget !== null"
      title="Restore this backup?"
      description="This overwrites the current world with the backup. A safety backup is taken first. Restart the server afterwards to load it."
      tone="destructive"
      confirm-label="Restore"
      :loading="restore.isPending.value"
      @update:open="(v) => !v && (restoreTarget = null)"
      @confirm="confirmRestore"
    />
    <ConfirmDialog
      :open="deleteTarget !== null"
      title="Delete this backup?"
      :description="`${deleteTarget?.name ?? ''} will be permanently removed.`"
      tone="destructive"
      confirm-label="Delete"
      :loading="remove.isPending.value"
      @update:open="(v) => !v && (deleteTarget = null)"
      @confirm="confirmDelete"
    />
  </section>
</template>
