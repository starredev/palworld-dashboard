import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { api } from '@/lib/api'

/** Admin command mutations. Player actions refresh the player list on success. */
export function useServerCommands() {
  const queryClient = useQueryClient()
  const refreshPlayers = () => queryClient.invalidateQueries({ queryKey: ['players'] })

  const broadcast = useMutation({ mutationFn: (message: string) => api.broadcast(message) })
  const save = useMutation({ mutationFn: () => api.save() })
  const shutdown = useMutation({
    mutationFn: (input: { seconds: number; message: string }) => api.shutdown(input),
  })
  const kick = useMutation({
    mutationFn: (userId: string) => api.kickPlayer(userId),
    onSuccess: refreshPlayers,
  })
  const ban = useMutation({
    mutationFn: (userId: string) => api.banPlayer(userId),
    onSuccess: refreshPlayers,
  })

  return { broadcast, save, shutdown, kick, ban }
}
