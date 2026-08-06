<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import PageTabs from '@/components/common/PageTabs.vue'
import PlayersPage from './PlayersPage.vue'
import GuildsPage from '@/features/guilds/pages/GuildsPage.vue'

const TABS = [
  { key: 'players', label: 'Players' },
  { key: 'guilds', label: 'Guilds' },
]
const route = useRoute()
const tab = ref(route.query.tab === 'guilds' ? 'guilds' : 'players')
</script>

<template>
  <div class="space-y-5">
    <PageTabs v-model="tab" :tabs="TABS" />
    <PlayersPage v-if="tab === 'players'" />
    <GuildsPage v-else />
  </div>
</template>
