import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { SaveOpInput } from '@tsuki/types'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useSaveStatus } from './use-save-editor'

/** Add a single edit to the pending batch (used by the edit dialogs). */
export function useQueueOp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (op: SaveOpInput) => api.addSaveOp(op),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saveBatch'] }),
  })
}

/** The full pending batch + controls (used by the floating batch bar). */
export function useSaveBatch() {
  const qc = useQueryClient()
  const auth = useAuthStore()
  const saveStatus = useSaveStatus()
  const enabled = computed(() => auth.isAdmin && saveStatus.data.value?.canWrite === true)

  const query = useQuery({
    queryKey: ['saveBatch'],
    queryFn: () => api.getSaveBatch(),
    enabled,
    refetchInterval: 15_000,
  })
  const ops = computed(() => query.data.value?.ops ?? [])
  const invalidate = () => qc.invalidateQueries({ queryKey: ['saveBatch'] })

  const remove = useMutation({
    mutationFn: (id: string) => api.removeSaveOp(id),
    onSuccess: invalidate,
  })
  const clear = useMutation({ mutationFn: () => api.clearSaveBatch(), onSuccess: invalidate })
  const apply = useMutation({
    mutationFn: () => api.applySaveBatch(),
    onSuccess: () => {
      invalidate()
      // Refresh everything the edits may have changed (players, stats, inventory…).
      qc.invalidateQueries()
    },
  })

  return { ops, enabled, remove, clear, apply }
}
