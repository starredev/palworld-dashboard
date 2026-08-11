<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import PageTabs from '@/components/common/PageTabs.vue'
import PalsPage from './PalsPage.vue'
import PaldeckPage from '@/features/paldeck/pages/PaldeckPage.vue'
import PalboxPage from '@/features/palbox/pages/PalboxPage.vue'

const TABS = [
  { key: 'roster', label: 'Pals' },
  { key: 'box', label: 'Palbox' },
  { key: 'paldeck', label: 'Paldeck' },
]
const route = useRoute()
const initial = String(route.query.tab ?? '')
const tab = ref(TABS.some((t) => t.key === initial) ? initial : 'roster')
</script>

<template>
  <div class="space-y-5">
    <PageTabs v-model="tab" :tabs="TABS" />
    <PalsPage v-if="tab === 'roster'" />
    <PalboxPage v-else-if="tab === 'box'" />
    <PaldeckPage v-else />
  </div>
</template>
