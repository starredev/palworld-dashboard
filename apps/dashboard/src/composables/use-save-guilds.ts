import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useSaveStatus } from './use-save-editor'

/**
 * Guilds read from the save (GroupSaveDataMap) — the editable source, with
 * group ids + member uids the live-map list lacks. Admin + save-available only.
 */
export function useSaveGuilds() {
  const auth = useAuthStore()
  const saveStatus = useSaveStatus()
  const enabled = computed(() => auth.isAdmin && saveStatus.data.value?.available === true)

  const query = useQuery({
    queryKey: ['saveGuilds'],
    queryFn: () => api.getSaveGuilds(),
    enabled,
    staleTime: 30_000,
  })
  const guilds = computed(() => query.data.value?.guilds ?? [])
  return { query, guilds, enabled }
}
