<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Gamepad2, Loader2 } from 'lucide-vue-next'
import { APP_NAME } from '@tsuki/shared'
import { Button, Card, CardContent, Input } from '@tsuki/ui'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const password = ref('')
const error = ref('')
const submitting = ref(false)
const showPassword = ref(false)

const ERRORS: Record<string, string> = {
  forbidden: 'That Discord account is not allowed to access this panel.',
  state: 'Your login session expired. Please try again.',
  discord: 'Discord login failed. Please try again.',
}

onMounted(async () => {
  await auth.fetchAuthConfig()
  const code = route.query.error as string | undefined
  if (code && ERRORS[code]) error.value = ERRORS[code]
})

const discordEnabled = computed(() => auth.authConfig?.discord ?? false)

function loginWithDiscord(): void {
  window.location.href = api.discordLoginUrl()
}

async function onSubmit(): Promise<void> {
  error.value = ''
  submitting.value = true
  try {
    await auth.login(password.value)
    await router.replace((route.query.redirect as string) || '/')
  } catch {
    error.value = 'Incorrect password. Please try again.'
    password.value = ''
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="grid min-h-screen place-items-center p-4">
    <Card class="w-full max-w-sm">
      <CardContent class="space-y-6 p-6">
        <div class="flex flex-col items-center gap-3 text-center">
          <span
            class="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"
          >
            <Gamepad2 class="size-5" />
          </span>
          <div class="space-y-1">
            <h1 class="text-lg font-semibold tracking-tight">{{ APP_NAME }}</h1>
            <p class="text-sm text-muted-foreground">Sign in to manage your server</p>
          </div>
        </div>

        <p
          v-if="error"
          class="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {{ error }}
        </p>

        <Button v-if="discordEnabled" class="w-full" @click="loginWithDiscord">
          <svg viewBox="0 0 24 24" class="size-4" fill="currentColor" aria-hidden="true">
            <path
              d="M20.317 4.369A19.79 19.79 0 0 0 15.432 3c-.21.375-.455.88-.623 1.28a18.27 18.27 0 0 0-5.618 0A12.6 12.6 0 0 0 8.56 3 19.74 19.74 0 0 0 3.677 4.37C.533 9.046-.32 13.58.106 18.057a19.9 19.9 0 0 0 6.073 3.058c.488-.665.923-1.372 1.298-2.114a12.9 12.9 0 0 1-2.045-.978c.172-.126.34-.257.502-.392a14.2 14.2 0 0 0 12.132 0c.164.14.332.27.502.392-.652.386-1.338.714-2.048.978.375.742.81 1.45 1.298 2.114a19.87 19.87 0 0 0 6.076-3.058c.5-5.19-.838-9.683-3.36-13.688ZM8.02 15.331c-1.183 0-2.156-1.085-2.156-2.419 0-1.333.952-2.418 2.156-2.418 1.21 0 2.176 1.096 2.156 2.418 0 1.334-.952 2.419-2.156 2.419Zm7.96 0c-1.183 0-2.156-1.085-2.156-2.419 0-1.333.951-2.418 2.156-2.418 1.21 0 2.176 1.096 2.156 2.418 0 1.334-.946 2.419-2.156 2.419Z"
            />
          </svg>
          Continue with Discord
        </Button>

        <div v-if="discordEnabled && !showPassword" class="text-center">
          <button
            type="button"
            class="text-xs text-muted-foreground underline-offset-4 hover:underline"
            @click="showPassword = true"
          >
            Sign in with admin password instead
          </button>
        </div>

        <form v-if="!discordEnabled || showPassword" class="space-y-3" @submit.prevent="onSubmit">
          <Input
            v-model="password"
            type="password"
            placeholder="Admin password"
            autocomplete="current-password"
            :autofocus="!discordEnabled"
          />
          <Button
            type="submit"
            class="w-full"
            variant="outline"
            :disabled="submitting || !password"
          >
            <Loader2 v-if="submitting" class="size-4 animate-spin" />
            {{ submitting ? 'Signing in…' : 'Sign in' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
