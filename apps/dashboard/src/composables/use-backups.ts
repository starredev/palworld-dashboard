import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { api } from '@/lib/api'

/** Backups list + create/restore/delete mutations. */
export function useBackups() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['backups'] })

  const query = useQuery({ queryKey: ['backups'], queryFn: () => api.getBackups() })
  const create = useMutation({ mutationFn: () => api.createBackup(), onSuccess: invalidate })
  const restore = useMutation({
    mutationFn: (name: string) => api.restoreBackup(name),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (name: string) => api.deleteBackup(name),
    onSuccess: invalidate,
  })

  return { query, create, restore, remove }
}
