<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Compass } from 'lucide-vue-next'
import { Button } from '@tsuki/ui'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'

const router = useRouter()
</script>

<template>
  <div class="space-y-4">
    <PagePlaceholder
      :icon="Compass"
      title="Page not found"
      description="That route doesn't exist yet. It may arrive in a later phase."
    />
    <div class="flex justify-center">
      <Button @click="router.push('/')">Back to overview</Button>
    </div>
  </div>
</template>
