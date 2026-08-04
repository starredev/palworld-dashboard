import { LayoutDashboard, Users, Map, SlidersHorizontal, type LucideIcon } from 'lucide-vue-next'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

/** Primary sidebar navigation. Extend as features land in later phases. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', to: '/', icon: LayoutDashboard },
  { label: 'Players', to: '/players', icon: Users },
  { label: 'Map', to: '/map', icon: Map },
  { label: 'Config', to: '/config', icon: SlidersHorizontal },
]
