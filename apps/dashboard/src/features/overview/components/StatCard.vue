<script setup lang="ts">
import type { LucideIcon } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardContent, Skeleton } from '@tsuki/ui'

defineProps<{
  label: string
  value?: string | number
  icon: LucideIcon
  loading?: boolean
}>()
</script>

<template>
  <Card>
    <CardHeader class="flex-row items-center justify-between">
      <CardTitle>{{ label }}</CardTitle>
      <component :is="icon" class="size-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <Skeleton v-if="loading" class="h-8 w-24" />
      <p v-else class="text-2xl font-semibold tracking-tight">{{ value ?? '—' }}</p>
    </CardContent>
  </Card>
</template>
