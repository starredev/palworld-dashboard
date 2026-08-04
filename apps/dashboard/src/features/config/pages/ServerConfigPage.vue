<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@tsuki/ui'
import { GROUPS, FIELDS } from '../fields'
import { PRESETS } from '../presets'
import { useConfigEditor } from '../use-config-editor'
import ConfigField from '../components/ConfigField.vue'
import ConfigOutput from '../components/ConfigOutput.vue'
import ServerConfigActions from '../components/ServerConfigActions.vue'

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

    <ServerConfigActions :body="body" @load="importText" />

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
