import {
  LayoutDashboard,
  Users,
  Shield,
  PawPrint,
  BookOpen,
  Map,
  LineChart,
  SlidersHorizontal,
  CalendarClock,
  ScrollText,
  Archive,
  History,
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
  { label: 'Guilds', to: '/guilds', icon: Shield },
  { label: 'Pals', to: '/pals', icon: PawPrint },
  { label: 'Paldeck', to: '/paldeck', icon: BookOpen },
  { label: 'Map', to: '/map', icon: Map },
  { label: 'Insights', to: '/insights', icon: LineChart },
  { label: 'Config', to: '/config', icon: SlidersHorizontal },
  { label: 'Schedules', to: '/schedules', icon: CalendarClock },
  { label: 'Logs', to: '/logs', icon: ScrollText },
  { label: 'Backups', to: '/backups', icon: Archive },
  { label: 'Activity', to: '/activity', icon: History },
]
