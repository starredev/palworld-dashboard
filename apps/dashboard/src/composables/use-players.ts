import type { Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api } from '@/lib/api'

/**
 * Live player list. Seeded by an initial fetch, then kept fresh by the realtime
 * WebSocket. Pass an `enabled` ref so it only runs when the server is reachable.
 */
export function usePlayers(enabled: Ref<boolean>) {
  return useQuery({
    queryKey: ['players'],
    queryFn: () => api.getPlayers(),
    enabled,
  })
}
