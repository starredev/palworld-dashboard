import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api } from '@/lib/api'

/** Connection status — cheap poll that gates the richer queries below. */
export function useServerStatus() {
  return useQuery({
    queryKey: ['server', 'status'],
    queryFn: () => api.getServerStatus(),
    refetchInterval: 15_000,
  })
}

/** Live metrics + info, only fetched while the server is reachable. */
export function useServerOverview() {
  const status = useServerStatus()
  const enabled = computed(() => status.data.value?.reachable === true)

  const metrics = useQuery({
    queryKey: ['server', 'metrics'],
    queryFn: () => api.getServerMetrics(),
    refetchInterval: 10_000,
    enabled,
  })

  const info = useQuery({
    queryKey: ['server', 'info'],
    queryFn: () => api.getServerInfo(),
    enabled,
  })

  return { status, metrics, info, enabled }
}
