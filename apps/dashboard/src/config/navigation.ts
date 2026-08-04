import { LayoutDashboard, Users, Settings, type LucideIcon } from 'lucide-vue-next'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

/** Primary sidebar navigation. Extend as features land in later phases. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', to: '/', icon: LayoutDashboard },
  { label: 'Players', to: '/players', icon: Users },
  { label: 'Settings', to: '/settings', icon: Settings },
]
