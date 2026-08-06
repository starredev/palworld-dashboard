import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from '@tsuki/ui'
import type { SaveOpInput } from '@tsuki/types'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useSaveStatus } from './use-save-editor'

/** Add a single edit to the pending batch (used by the edit dialogs). */
export function useQueueOp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (op: SaveOpInput) => api.addSaveOp(op),
    onSuccess: (_data, op) => {
      qc.invalidateQueries({ queryKey: ['saveBatch'] })
      toast.success('Added to batch', op.label)
    },
    onError: (e: unknown) =>
      toast.error('Could not queue edit', (e as Error)?.message ?? 'Unknown error'),
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
    onError: (e: unknown) =>
      toast.error('Could not remove edit', (e as Error)?.message ?? 'Unknown error'),
  })
  const clear = useMutation({
    mutationFn: () => api.clearSaveBatch(),
    onSuccess: () => {
      invalidate()
      toast.info('Batch cleared')
    },
  })
  const apply = useMutation({
    mutationFn: () => api.applySaveBatch(),
    onSuccess: (r) => {
      invalidate()
      // Refresh everything the edits may have changed (players, stats, inventory…).
      qc.invalidateQueries()
      // Partial failures keep the detailed result panel in SaveBatchBar; only
      // toast the clean-success case here to avoid a double notification.
      if (!r.failed.length) {
        toast.success(
          `Applied ${r.applied} change${r.applied === 1 ? '' : 's'}`,
          'Server restarted.',
        )
      }
    },
    onError: (e: unknown) =>
      toast.error('Apply failed', (e as Error)?.message ?? 'The server may not have restarted.'),
  })

  return { ops, enabled, remove, clear, apply }
}
