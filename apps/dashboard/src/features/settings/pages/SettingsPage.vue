<script setup lang="ts">
import { Settings } from 'lucide-vue-next'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'
</script>

<template>
  <PagePlaceholder
    :icon="Settings"
    title="Settings"
    description="Server connection, RCON credentials, and panel preferences will be configurable here."
  />
</template>
