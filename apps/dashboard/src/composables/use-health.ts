import { useQuery } from '@tanstack/vue-query'
import { api } from '@/lib/api'

/** Polls the API health endpoint; drives the connection indicator in the topbar. */
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.getHealth(),
    refetchInterval: 15_000,
  })
}
