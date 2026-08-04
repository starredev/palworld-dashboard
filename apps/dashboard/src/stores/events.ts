import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ServerEvent } from '@tsuki/types'

/** Live server activity (join/leave, online/offline), fed by the WebSocket. */
export const useEventsStore = defineStore('events', () => {
  const events = ref<ServerEvent[]>([])

  function add(event: ServerEvent): void {
    if (events.value.some((e) => e.id === event.id)) return
    events.value = [event, ...events.value].slice(0, 100)
  }

  return { events, add }
})
