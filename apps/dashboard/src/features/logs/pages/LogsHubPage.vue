<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import PageTabs from '@/components/common/PageTabs.vue'
import LogsPage from './LogsPage.vue'
import ActivityPage from '@/features/activity/pages/ActivityPage.vue'

const TABS = [
  { key: 'logs', label: 'Server logs' },
  { key: 'activity', label: 'Activity' },
]
const route = useRoute()
const tab = ref(route.query.tab === 'activity' ? 'activity' : 'logs')
</script>

<template>
  <div class="space-y-5">
    <PageTabs v-model="tab" :tabs="TABS" />
    <LogsPage v-if="tab === 'logs'" />
    <ActivityPage v-else />
  </div>
</template>
