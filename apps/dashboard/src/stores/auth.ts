import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SessionUser } from '@tsuki/types'
import { api } from '@/lib/api'
import { ApiError } from '@/lib/http'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<SessionUser | null>(null)
  const ready = ref(false)

  /** Resolve the current session once on app start (401 → unauthenticated). */
  async function fetchSession(): Promise<void> {
    try {
      const { user: sessionUser } = await api.getSession()
      user.value = sessionUser
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        user.value = null
      } else {
        throw error
      }
    } finally {
      ready.value = true
    }
  }

  async function login(password: string): Promise<void> {
    const { user: sessionUser } = await api.login(password)
    user.value = sessionUser
  }

  async function logout(): Promise<void> {
    await api.logout()
    user.value = null
  }

  return { user, ready, fetchSession, login, logout }
})
