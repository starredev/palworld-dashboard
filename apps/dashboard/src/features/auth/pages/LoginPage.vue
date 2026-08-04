<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Gamepad2, Loader2 } from 'lucide-vue-next'
import { APP_NAME } from '@tsuki/shared'
import { Button, Card, CardContent, Input } from '@tsuki/ui'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const password = ref('')
const error = ref('')
const submitting = ref(false)

async function onSubmit() {
  error.value = ''
  submitting.value = true
  try {
    await auth.login(password.value)
    const redirect = (route.query.redirect as string) || '/'
    await router.replace(redirect)
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

        <form class="space-y-3" @submit.prevent="onSubmit">
          <Input
            v-model="password"
            type="password"
            placeholder="Admin password"
            autocomplete="current-password"
            autofocus
          />
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
          <Button type="submit" class="w-full" :disabled="submitting || !password">
            <Loader2 v-if="submitting" class="size-4 animate-spin" />
            {{ submitting ? 'Signing in…' : 'Sign in' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
