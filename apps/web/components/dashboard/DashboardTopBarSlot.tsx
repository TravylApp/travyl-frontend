'use client'

import { createContext, useContext } from 'react'

/**
 * Context slot for trip layout to inject tab bar into DashboardTopBar.
 * DashboardTopBar reads this — if set, it renders the trip tabs instead
 * of a breadcrumb. The trip layout sets this inside TripThemeProvider
 * so the tabs have access to trip theme colors.
 */
export const DashboardTopBarSlot = createContext<React.ReactNode>(null)

export function useDashboardTopBarSlot() {
  return useContext(DashboardTopBarSlot)
}
