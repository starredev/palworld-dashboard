<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@tsuki/ui'
import { useAuthStore } from '@/stores/auth'
import { GROUPS, FIELDS } from '../fields'
import { PRESETS } from '../presets'
import { useConfigEditor } from '../use-config-editor'
import ConfigField from '../components/ConfigField.vue'
import ConfigOutput from '../components/ConfigOutput.vue'
import ServerConfigActions from '../components/ServerConfigActions.vue'
import RestartScheduleCard from '../components/RestartScheduleCard.vue'
import ConfigProfilesCard from '../components/ConfigProfilesCard.vue'
import ConfigEventsCard from '../components/ConfigEventsCard.vue'

const auth = useAuthStore()
const { values, activePreset, applyPreset, importText, ini, body, changedCount } = useConfigEditor()

const grouped = computed(() =>
  GROUPS.map((group) => ({ group, fields: FIELDS.filter((f) => f.group === group) })),
)
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-1">
      <h2 class="text-xl font-semibold tracking-tight">Server config</h2>
      <p class="text-sm text-muted-foreground">
        Build your <span class="font-mono">PalWorldSettings.ini</span>, then copy it in and restart
        the server to apply.
      </p>
    </header>

    <template v-if="auth.isAdmin">
      <ServerConfigActions :body="body" @load="importText" />

      <div class="grid gap-6 lg:grid-cols-2">
        <ConfigProfilesCard :body="body" />
        <ConfigEventsCard />
      </div>

      <RestartScheduleCard />
    </template>
    <p
      v-else
      class="rounded-lg border border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground"
    >
      You're signed in as a viewer — settings are read-only. Ask an admin to apply changes.
    </p>

    <div class="flex flex-wrap gap-2">
      <Button
        v-for="preset in PRESETS"
        :key="preset.id"
        size="sm"
        :variant="activePreset === preset.id ? 'default' : 'outline'"
        @click="applyPreset(preset.id)"
      >
        {{ preset.label }}
      </Button>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <Card v-for="{ group, fields } in grouped" :key="group">
          <CardHeader
            ><CardTitle class="text-foreground">{{ group }}</CardTitle></CardHeader
          >
          <CardContent class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <ConfigField
              v-for="field in fields"
              :key="field.key"
              v-model="values[field.key]"
              :field="field"
            />
          </CardContent>
        </Card>
      </div>

      <div class="lg:sticky lg:top-6 lg:self-start">
        <ConfigOutput :ini="ini" :changed="changedCount" @import="importText" />
      </div>
    </div>
  </section>
</template>
