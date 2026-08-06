import {
  LayoutDashboard,
  Users,
  PawPrint,
  Hammer,
  Map,
  LineChart,
  SlidersHorizontal,
  CalendarClock,
  ScrollText,
  Archive,
  type LucideIcon,
} from 'lucide-vue-next'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

/** Primary sidebar navigation. Extend as features land in later phases. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', to: '/', icon: LayoutDashboard },
  { label: 'Players', to: '/players', icon: Users },
  { label: 'Pals', to: '/pals', icon: PawPrint },
  { label: 'Crafting', to: '/crafting', icon: Hammer },
  { label: 'Map', to: '/map', icon: Map },
  { label: 'Insights', to: '/insights', icon: LineChart },
  { label: 'Config', to: '/config', icon: SlidersHorizontal },
  { label: 'Schedules', to: '/schedules', icon: CalendarClock },
  { label: 'Logs', to: '/logs', icon: ScrollText },
  { label: 'Backups', to: '/backups', icon: Archive },
]
