import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuthConfig, SessionUser } from '@tsuki/types'
import { api } from '@/lib/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<SessionUser | null>(null)
  const authConfig = ref<AuthConfig | null>(null)
  const ready = ref(false)

  const isAdmin = computed(() => user.value?.role === 'admin')

  /**
   * Resolve the current session once on app start. Any failure (401, or a stale
   * pre-upgrade cookie that no longer matches the session shape) simply means
   * "not signed in" — never block app load.
   */
  async function fetchSession(): Promise<void> {
    try {
      const { user: sessionUser } = await api.getSession()
      user.value = sessionUser
    } catch {
      user.value = null
    } finally {
      ready.value = true
    }
  }

  /** Which login methods the server offers (password / Discord). */
  async function fetchAuthConfig(): Promise<void> {
    try {
      authConfig.value = await api.getAuthConfig()
    } catch {
      authConfig.value = { passwordLogin: true, discord: false }
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

  return { user, authConfig, ready, isAdmin, fetchSession, fetchAuthConfig, login, logout }
})
