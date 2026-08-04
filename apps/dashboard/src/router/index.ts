import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/** Authed pages render inside the dashboard shell; every page is lazy-loaded. */
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/pages/LoginPage.vue'),
    meta: { title: 'Sign in', public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/DashboardLayout.vue'),
    children: [
      {
        path: '',
        name: 'overview',
        component: () => import('@/features/overview/pages/OverviewPage.vue'),
        meta: { title: 'Overview' },
      },
      {
        path: 'players',
        name: 'players',
        component: () => import('@/features/players/pages/PlayersPage.vue'),
        meta: { title: 'Players' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/features/settings/pages/SettingsPage.vue'),
        meta: { title: 'Settings' },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/features/misc/pages/NotFoundPage.vue'),
        meta: { title: 'Not found' },
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.ready) await auth.fetchSession()

  if (!to.meta.public && !auth.user) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.user) {
    return { path: '/' }
  }
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · Tsuki Panel` : 'Tsuki Panel'
})
