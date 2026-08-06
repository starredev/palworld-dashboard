import { reactive } from 'vue'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
  description?: string
}

// Module-level singleton so `toast.*()` (called anywhere) and the single
// <Toaster> that renders them share one queue.
export const toasts = reactive<Toast[]>([])

let seq = 0

export function dismissToast(id: number): void {
  const i = toasts.findIndex((t) => t.id === id)
  if (i !== -1) toasts.splice(i, 1)
}

function push(tone: ToastTone, message: string, description?: string): number {
  const id = ++seq
  toasts.push({ id, tone, message, description })
  if (typeof window !== 'undefined') {
    // Errors linger a little longer since they're more likely to be read.
    window.setTimeout(() => dismissToast(id), tone === 'error' ? 6000 : 3500)
  }
  return id
}

export const toast = {
  success: (message: string, description?: string) => push('success', message, description),
  error: (message: string, description?: string) => push('error', message, description),
  info: (message: string, description?: string) => push('info', message, description),
}
