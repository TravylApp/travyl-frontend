import { useState, useCallback, useEffect } from 'react'

export type CalendarTheme = 'light' | 'dark'

const STORAGE_KEY = 'travyl-calendar-theme'

export function useCalendarTheme() {
  // Default to 'light' on server; client corrects on mount via useEffect
  const [theme, setTheme] = useState<CalendarTheme>('light')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark') setTheme('dark')
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: CalendarTheme = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
