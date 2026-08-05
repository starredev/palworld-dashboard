<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import RestartScheduleCard from '@/features/config/components/RestartScheduleCard.vue'
import ConfigEventsCard from '@/features/config/components/ConfigEventsCard.vue'

const auth = useAuthStore()
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-1">
      <h2 class="text-xl font-semibold tracking-tight">Schedules</h2>
      <p class="text-sm text-muted-foreground">
        Automate your server on a timer — nightly restarts and timed config events like a Double EXP
        weekend. All ini-safe (force-restart, never reverts your config).
      </p>
    </header>

    <template v-if="auth.isAdmin">
      <RestartScheduleCard />
      <ConfigEventsCard />
    </template>
    <p
      v-else
      class="rounded-lg border border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground"
    >
      You're signed in as a viewer — schedules are read-only. Ask an admin to change them.
    </p>
  </section>
</template>
