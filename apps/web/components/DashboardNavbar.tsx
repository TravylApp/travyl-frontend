'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@travyl/shared'
import { Settings, LogOut, User, Sun, Moon, Map, Compass, Luggage } from 'lucide-react'
import { PaperPlane } from '@/components/ui'

function getInitials(name: string | undefined): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const NAV_LINKS = [
  { href: '/trips', label: 'My Trips', icon: Luggage },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/places', label: 'Places', icon: Map },
]

export default function DashboardNavbar() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const avatarUrl = user?.user_metadata?.avatar_url
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name
  const email = user?.email
  const initials = getInitials(displayName)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDarkMode(prefersDark)
    document.documentElement.classList.toggle('dark', prefersDark)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTheme = () => {
    const next = !isDarkMode
    setIsDarkMode(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  const handleSignOut = async () => {
    setDropdownOpen(false)
    await signOut()
  }

  function isActive(href: string) {
    if (href === '/trips') return pathname === '/trips' || pathname.startsWith('/trips')
    return pathname.startsWith(href)
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 border-b border-gray-200 dark:border-[#1e3a5f]/30 bg-white/90 dark:bg-[#0a1520]/90 backdrop-blur-xl flex items-center shrink-0">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2 px-5 h-full border-r border-gray-200 dark:border-[#1e3a5f]/30 text-[#1e3a5f] dark:text-[#f5efe8] shrink-0"
      >
        <PaperPlane size={20} className="text-[#1e3a5f] dark:text-[#f5efe8]" />
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-0.5 px-3 h-full">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-[#1e3a5f]/10 dark:bg-[#1e3a5f]/30 text-[#1e3a5f] dark:text-[#f5efe8] font-medium'
                  : 'text-gray-500 dark:text-[#4a7ab5] hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/20 hover:text-gray-900 dark:hover:text-white',
              ].join(' ')}
            >
              <Icon size={15} className="shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2 px-4 h-full">
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-[#1e3a5f]/20 transition-all"
            >
              <div className="h-8 w-8 flex items-center justify-center rounded-full overflow-hidden bg-[#1e3a5f] text-white font-medium text-sm">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName || 'User'} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#0f1a28] rounded-xl shadow-xl border border-gray-100 dark:border-[#1e3a5f]/30 py-1.5 z-50">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-[#1e3a5f]/20">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full overflow-hidden bg-[#1e3a5f] text-white font-medium text-sm shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName || 'User'} className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-[#f5efe8] truncate">{displayName || 'User'}</p>
                      <p className="text-xs text-gray-500 dark:text-[#4a7ab5] truncate">{email}</p>
                    </div>
                  </div>
                </div>

                <div className="py-0.5">
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
                  >
                    <User size={15} className="text-gray-400" />
                    Your Profile
                  </Link>
                  <Link
                    href="/profile/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
                  >
                    <Settings size={15} className="text-gray-400" />
                    Settings
                  </Link>
                </div>

                <div className="border-t border-gray-100 dark:border-[#1e3a5f]/20 py-1">
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      {isDarkMode
                        ? <Moon size={15} className="text-gray-400" />
                        : <Sun size={15} className="text-gray-400" />}
                      {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                    </span>
                  </button>
                </div>

                <div className="border-t border-gray-100 dark:border-[#1e3a5f]/20 py-0.5">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
