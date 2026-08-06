<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import PageTabs from '@/components/common/PageTabs.vue'
import PalsPage from './PalsPage.vue'
import PaldeckPage from '@/features/paldeck/pages/PaldeckPage.vue'

const TABS = [
  { key: 'roster', label: 'Pals' },
  { key: 'paldeck', label: 'Paldeck' },
]
const route = useRoute()
const tab = ref(route.query.tab === 'paldeck' ? 'paldeck' : 'roster')
</script>

<template>
  <div class="space-y-5">
    <PageTabs v-model="tab" :tabs="TABS" />
    <PalsPage v-if="tab === 'roster'" />
    <PaldeckPage v-else />
  </div>
</template>
