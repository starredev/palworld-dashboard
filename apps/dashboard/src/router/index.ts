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
        path: 'guilds',
        name: 'guilds',
        component: () => import('@/features/guilds/pages/GuildsPage.vue'),
        meta: { title: 'Guilds' },
      },
      {
        path: 'pals',
        name: 'pals',
        component: () => import('@/features/pals/pages/PalsPage.vue'),
        meta: { title: 'Pals' },
      },
      {
        path: 'map',
        name: 'map',
        component: () => import('@/features/map/pages/MapPage.vue'),
        meta: { title: 'Live map' },
      },
      {
        path: 'insights',
        name: 'insights',
        component: () => import('@/features/insights/pages/InsightsPage.vue'),
        meta: { title: 'Insights' },
      },
      {
        path: 'logs',
        name: 'logs',
        component: () => import('@/features/logs/pages/LogsPage.vue'),
        meta: { title: 'Logs' },
      },
      {
        path: 'config',
        name: 'config',
        component: () => import('@/features/config/pages/ServerConfigPage.vue'),
        meta: { title: 'Server config' },
      },
      {
        path: 'schedules',
        name: 'schedules',
        component: () => import('@/features/schedules/pages/SchedulesPage.vue'),
        meta: { title: 'Schedules' },
      },
      {
        path: 'backups',
        name: 'backups',
        component: () => import('@/features/backups/pages/BackupsPage.vue'),
        meta: { title: 'Backups' },
      },
      {
        path: 'activity',
        name: 'activity',
        component: () => import('@/features/activity/pages/ActivityPage.vue'),
        meta: { title: 'Activity' },
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
