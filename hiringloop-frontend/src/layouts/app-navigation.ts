import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

import type { OrganizationPermission } from '../features/organizations/types/organization.types'

interface NavigationItem {
  label: string
  segment: string
  icon: LucideIcon
  permission?: OrganizationPermission
  relatedSegments?: readonly string[]
}

interface NavigationGroup {
  label: string
  items: readonly NavigationItem[]
}

export const navigationGroups: readonly NavigationGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', segment: '', icon: LayoutDashboard },
      {
        label: 'Jobs',
        segment: 'jobs',
        icon: BriefcaseBusiness,
        permission: 'job:list',
      },
      {
        label: 'Candidates',
        segment: 'candidates',
        relatedSegments: ['applications'],
        icon: Users,
        permission: 'candidate:list',
      },
      {
        label: 'Interviews',
        segment: 'interviews',
        icon: CalendarDays,
        permission: 'interview:view-assigned',
      },
    ],
  },
  {
    label: 'Talent',
    items: [
      {
        label: 'Talent Pools',
        segment: 'talent-pools',
        icon: UsersRound,
        permission: 'talent-pool:view',
      },
    ],
  },
  {
    label: 'Insights',
    items: [
      {
        label: 'Analytics',
        segment: 'analytics',
        icon: BarChart3,
        permission: 'analytics:view',
      },
      {
        label: 'Audit Log',
        segment: 'audit',
        icon: ClipboardList,
        permission: 'audit:view',
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        label: 'Team',
        segment: 'team',
        icon: UsersRound,
        permission: 'member:role-change',
      },
    ],
  },
  {
    label: 'Utilities',
    items: [
      {
        label: 'Notifications',
        segment: 'notifications',
        icon: Bell,
        permission: 'notification:view-own',
      },
    ],
  },
]

export function workspacePath(organizationId: string) {
  return `/app/organizations/${organizationId}`
}

export function navigationPath(organizationId: string, segment: string) {
  const root = workspacePath(organizationId)
  return segment ? `${root}/${segment}` : root
}

export function visibleNavigationGroups(
  permissions: readonly OrganizationPermission[] | undefined,
) {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || permissions?.includes(item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0)
}

export function isNavigationActive(
  pathname: string,
  organizationId: string,
  item: NavigationItem,
) {
  const root = workspacePath(organizationId)
  if (!item.segment) return pathname === root
  const segments = [item.segment, ...(item.relatedSegments ?? [])]
  return segments.some((segment) => {
    const path = `${root}/${segment}`
    return pathname === path || pathname.startsWith(`${path}/`)
  })
}

export function currentNavigationLabel(
  pathname: string,
  organizationId: string,
  permissions: readonly OrganizationPermission[] | undefined,
) {
  for (const group of visibleNavigationGroups(permissions)) {
    const item = group.items.find((candidate) =>
      isNavigationActive(pathname, organizationId, candidate),
    )
    if (item) return item.label
  }
  return 'Workspace'
}
