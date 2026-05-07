'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@travyl/shared'
import { DASHBOARD_NAV_ITEMS } from '@/hooks/useDashboardNav'
import { PaperPlane } from '@/components/ui'

export function DashboardNavBar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const initials = user?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <header className="shrink-0 h-12 border-b border-gray-200 dark:border-white/[0.06] bg-white dark:bg-background flex items-center px-4 sm:px-6 gap-4">
      {/* Logo */}
      <Link href="/trips" className="flex items-center gap-1.5 group shrink-0">
        <PaperPlane
          size={18}
          className="text-[var(--trip-base)] group-hover:text-[#F59E0B] transition-colors"
          style={{ transform: 'rotate(-20deg)' }}
        />
        <span
          className="text-[var(--trip-base)] group-hover:text-[#F59E0B] transition-colors hidden sm:inline"
          style={{ fontFamily: 'var(--font-brand)', fontWeight: 800, fontSize: 15 }}
        >
          TRAVYL
        </span>
      </Link>

      <div className="w-px h-5 bg-gray-200 dark:bg-white/10 shrink-0" />

      {/* Nav items */}
      <nav className="flex items-center gap-0.5 flex-1">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.segment}
              href={item.href}
              className={[
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-trip-base/10 text-[var(--trip-base)] dark:bg-white/10 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-200',
              ].join(' ')}
            >
              <Icon width={15} height={15} strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User avatar */}
      <Link
        href="/profile"
        className="flex items-center justify-center w-7 h-7 rounded-full bg-trip-base text-white text-[11px] font-medium shrink-0 hover:ring-2 hover:ring-[var(--trip-base)]/30 transition-all"
      >
        {initials}
      </Link>
    </header>
  )
}
