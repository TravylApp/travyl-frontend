'use client'

import { createContext, useContext } from 'react'
import { HOUR_HEIGHT as DEFAULT_HOUR_HEIGHT } from './constants'

const HourHeightContext = createContext<number>(DEFAULT_HOUR_HEIGHT)

interface HourHeightProviderProps {
  value: number
  children: React.ReactNode
}

export function HourHeightProvider({ value, children }: HourHeightProviderProps) {
  return (
    <HourHeightContext.Provider value={value}>{children}</HourHeightContext.Provider>
  )
}

export function useHourHeight(): number {
  return useContext(HourHeightContext)
}
