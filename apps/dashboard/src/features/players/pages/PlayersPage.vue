<script setup lang="ts">
import { Users } from 'lucide-vue-next'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'
</script>

<template>
  <PagePlaceholder
    :icon="Users"
    title="Players"
    description="Online players, sessions, and moderation tools land in Phase 2 once the RCON and REST clients are wired up."
  />
</template>
