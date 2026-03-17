import { createContext, useContext } from 'react'

interface CalendarThemeContextValue {
  isDark: boolean
}

export const CalendarThemeContext = createContext<CalendarThemeContextValue>({
  isDark: false,
})
CalendarThemeContext.displayName = 'CalendarThemeContext'

export function useCalendarThemeContext(): CalendarThemeContextValue {
  return useContext(CalendarThemeContext)
}
