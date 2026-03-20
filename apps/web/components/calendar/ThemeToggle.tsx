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
      className="flex items-center justify-center h-8 w-8 rounded-lg text-[var(--cal-nav-inactive)] hover:bg-[var(--cal-border-light)] hover:text-[var(--cal-text)] transition-colors shrink-0"
    >
      {isDark ? (
        <SunLight width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <HalfMoon width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
      )}
    </button>
  )
}
