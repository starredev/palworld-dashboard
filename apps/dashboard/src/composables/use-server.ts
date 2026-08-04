import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api } from '@/lib/api'

/**
 * Connection status. Seeded by an initial fetch, then kept fresh by the
 * realtime WebSocket (see use-realtime), so no client polling is needed.
 */
export function useServerStatus() {
  return useQuery({
    queryKey: ['server', 'status'],
    queryFn: () => api.getServerStatus(),
  })
}

/** Live metrics + info, only fetched while the server is reachable. */
export function useServerOverview() {
  const status = useServerStatus()
  const enabled = computed(() => status.data.value?.reachable === true)

  const metrics = useQuery({
    queryKey: ['server', 'metrics'],
    queryFn: () => api.getServerMetrics(),
    enabled,
  })

  const info = useQuery({
    queryKey: ['server', 'info'],
    queryFn: () => api.getServerInfo(),
    enabled,
  })

  return { status, metrics, info, enabled }
}
