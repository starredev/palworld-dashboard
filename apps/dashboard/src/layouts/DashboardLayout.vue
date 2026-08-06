<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import { Toaster } from '@tsuki/ui'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import SaveBatchBar from '@/components/layout/SaveBatchBar.vue'
import { useRealtime } from '@/composables/use-realtime'

const sidebarOpen = ref(false)

// One WebSocket for the whole authed app; pushes live data into the query cache.
const { connected } = useRealtime()
</script>

<template>
  <div class="flex h-full">
    <!-- Desktop sidebar -->
    <div class="hidden lg:block">
      <AppSidebar />
    </div>

    <!-- Mobile drawer -->
    <Transition name="drawer">
      <div v-if="sidebarOpen" class="fixed inset-0 z-40 lg:hidden">
        <div class="absolute inset-0 bg-black/60" @click="sidebarOpen = false" />
        <div class="absolute inset-y-0 left-0">
          <AppSidebar @navigate="sidebarOpen = false" />
        </div>
      </div>
    </Transition>

    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopbar :live="connected" @toggle-sidebar="sidebarOpen = !sidebarOpen" />
      <main class="flex-1 overflow-y-auto p-4 lg:p-6">
        <div class="mx-auto w-full max-w-6xl">
          <RouterView v-slot="{ Component }">
            <Transition name="fade" mode="out-in">
              <component :is="Component" />
            </Transition>
          </RouterView>
        </div>
      </main>
    </div>

    <SaveBatchBar />
    <Toaster />
  </div>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.fade-leave-to {
  opacity: 0;
}
</style>
