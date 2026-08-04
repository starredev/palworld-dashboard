<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { Gamepad2, LogOut } from 'lucide-vue-next'
import { APP_NAME } from '@tsuki/shared'
import { NAV_ITEMS } from '@/config/navigation'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{ navigate: [] }>()

const auth = useAuthStore()
const router = useRouter()

async function signOut() {
  await auth.logout()
  emit('navigate')
  await router.replace({ name: 'login' })
}
</script>

<template>
  <aside class="flex h-full w-64 flex-col gap-6 border-r border-border bg-card/40 px-4 py-5">
    <RouterLink to="/" class="flex items-center gap-2.5 px-2" @click="$emit('navigate')">
      <span class="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Gamepad2 class="size-4" />
      </span>
      <span class="text-sm font-semibold tracking-tight">{{ APP_NAME }}</span>
    </RouterLink>

    <nav class="flex flex-1 flex-col gap-1">
      <RouterLink
        v-for="item in NAV_ITEMS"
        :key="item.to"
        :to="item.to"
        class="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        exact-active-class="bg-accent text-accent-foreground"
        @click="$emit('navigate')"
      >
        <component :is="item.icon" class="size-4 shrink-0" />
        {{ item.label }}
      </RouterLink>
    </nav>

    <button
      class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      @click="signOut"
    >
      <LogOut class="size-4 shrink-0" />
      Sign out
    </button>
  </aside>
</template>
