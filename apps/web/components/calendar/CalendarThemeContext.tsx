import { createContext, useContext } from 'react'

interface CalendarThemeContextValue {
  isDark: boolean
}

export const CalendarThemeContext = createContext<CalendarThemeContextValue>({
  isDark: false,
})

export function useCalendarThemeContext(): CalendarThemeContextValue {
  return useContext(CalendarThemeContext)
}
