'use client'
import { SunLight, HalfMoon } from 'iconoir-react'
import type { CalendarTheme } from './hooks/useCalendarTheme'

interface ThemeToggleProps {
  theme: CalendarTheme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark'
  return (
    <button
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-[#4a7ab5] dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white transition-colors shrink-0"
    >
      {isDark ? (
        <SunLight width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <HalfMoon width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
      )}
    </button>
  )
}
