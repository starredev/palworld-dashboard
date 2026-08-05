import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { api } from '@/lib/api'
import type { ConfigEventInput, ConfigProfileInput } from '@tsuki/types'

/** Queries + mutations for config profiles and scheduled events. */
export function useConfigProfiles() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['configProfiles'], queryFn: () => api.getConfigProfiles() })
  const invalidate = (): Promise<void> => qc.invalidateQueries({ queryKey: ['configProfiles'] })

  const saveProfile = useMutation({
    mutationFn: (input: ConfigProfileInput) => api.saveConfigProfile(input),
    onSuccess: invalidate,
  })
  const deleteProfile = useMutation({
    mutationFn: (id: string) => api.deleteConfigProfile(id),
    onSuccess: invalidate,
  })
  const applyProfile = useMutation({ mutationFn: (id: string) => api.applyConfigProfile(id) })
  const createEvent = useMutation({
    mutationFn: (input: ConfigEventInput) => api.createConfigEvent(input),
    onSuccess: invalidate,
  })
  const deleteEvent = useMutation({
    mutationFn: (id: string) => api.deleteConfigEvent(id),
    onSuccess: invalidate,
  })

  return { query, saveProfile, deleteProfile, applyProfile, createEvent, deleteEvent }
}
