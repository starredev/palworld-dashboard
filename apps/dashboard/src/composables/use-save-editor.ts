import { useQuery } from '@tanstack/vue-query'
import { api } from '@/lib/api'

/**
 * Save-file editor availability. `canWrite` means the converter AND Docker
 * container control are both wired up, so teleport (a write) is possible.
 */
export function useSaveStatus() {
  return useQuery({
    queryKey: ['saveStatus'],
    queryFn: () => api.getSaveStatus(),
    staleTime: 60_000,
  })
}
