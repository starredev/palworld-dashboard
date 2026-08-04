import { onScopeDispose, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { realtimeMessageSchema } from '@tsuki/types'
import { useEventsStore } from '@/stores/events'

function wsUrl(): string {
  const base = import.meta.env.VITE_API_URL ?? '/api'
  // Resolve relative bases against the current origin, then swap http->ws.
  const url = new URL(`${base.replace(/\/$/, '')}/ws`, window.location.origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

/**
 * Opens the realtime WebSocket and pushes incoming messages straight into the
 * TanStack Query cache, so components keep reading via their normal queries —
 * no polling required. Reconnects with a simple backoff.
 */
export function useRealtime() {
  const queryClient = useQueryClient()
  const events = useEventsStore()
  const connected = ref(false)

  let socket: WebSocket | null = null
  let retry = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  function apply(raw: string): void {
    const parsed = realtimeMessageSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return
    const message = parsed.data
    if (message.type === 'status') queryClient.setQueryData(['server', 'status'], message.data)
    else if (message.type === 'metrics')
      queryClient.setQueryData(['server', 'metrics'], message.data)
    else if (message.type === 'players')
      queryClient.setQueryData(['players'], { source: 'rest', players: message.data })
    else if (message.type === 'event') events.add(message.data)
  }

  function connect(): void {
    if (disposed) return
    socket = new WebSocket(wsUrl())

    socket.onopen = () => {
      connected.value = true
      retry = 0
    }
    socket.onmessage = (event) => apply(String(event.data))
    socket.onclose = () => {
      connected.value = false
      if (disposed) return
      retry = Math.min(retry + 1, 6)
      reconnectTimer = setTimeout(connect, retry * 1000)
    }
    socket.onerror = () => socket?.close()
  }

  connect()

  onScopeDispose(() => {
    disposed = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    socket?.close()
  })

  return { connected }
}
