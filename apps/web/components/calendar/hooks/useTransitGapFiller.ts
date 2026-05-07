'use client'

import { useState, useCallback } from 'react'
import { estimateTransit } from '@travyl/shared'
import { addTransit } from '@travyl/shared'
import { addDays, hourToTime } from '@travyl/shared'
import type { CalendarActivity } from '../types'
import type { VehicleType } from '@travyl/shared'

interface UseTransitGapFillerOptions {
  tripId: string
  tripStartDate: string
  userId: string
  activities: CalendarActivity[]
  addActivity: (activity: CalendarActivity) => Promise<void>
}

interface UseTransitGapFillerReturn {
  fillTransitGaps: () => Promise<number>
  isFilling: boolean
  lastCount: number
}

/**
 * Hook that scans consecutive activities on the same day and creates
 * auto-generated transport activities + transit bookings for any gaps
 * between activities at different locations.
 */
export function useTransitGapFiller({
  tripId,
  tripStartDate,
  userId,
  activities,
  addActivity,
}: UseTransitGapFillerOptions): UseTransitGapFillerReturn {
  const [isFilling, setIsFilling] = useState(false)
  const [lastCount, setLastCount] = useState(0)

  const fillTransitGaps = useCallback(async (): Promise<number> => {
    setIsFilling(true)
    let created = 0

    try {
      // Group scheduled activities by day, excluding ghost and unscheduled
      const activitiesByDay = new Map<number, CalendarActivity[]>()
      for (const a of activities) {
        if (a.unscheduled) continue
        if (a.id.startsWith('ghost-')) continue
        const dayList = activitiesByDay.get(a.day) ?? []
        dayList.push(a)
        activitiesByDay.set(a.day, dayList)
      }

      for (const [, dayActivities] of activitiesByDay) {
        // Sort by startHour
        const sorted = [...dayActivities].sort((a, b) => a.startHour - b.startHour)

        for (let i = 0; i < sorted.length - 1; i++) {
          const prev = sorted[i]
          const next = sorted[i + 1]

          // Skip if either lacks coordinates
          if (prev.latitude == null || prev.longitude == null) continue
          if (next.latitude == null || next.longitude == null) continue

          // Skip if either activity is already transport or flight
          if (prev.type === 'transport' || prev.type === 'flight') continue
          if (next.type === 'transport' || next.type === 'flight') continue

          // Estimate transit between them
          const estimate = estimateTransit(
            prev.latitude, prev.longitude,
            next.latitude, next.longitude,
          )
          if (estimate === null) continue // too close, walkable

          // Calculate gap: next start - (prev start + prev duration)
          const prevEnd = prev.startHour + (prev.duration ?? 1)
          const gap = next.startHour - prevEnd
          if (gap <= 0) continue // back-to-back or overlapping

          // Duration is the minimum of estimated transit and available gap
          const duration = Math.min(estimate.durationHours, gap)
          if (duration <= 0) continue

          // Duplicate detection: skip if a transport activity already exists
          // between prev's end and next's start
          const existingTransport = sorted.some(
            (a) =>
              a.type === 'transport' &&
              a.startHour >= prevEnd - 0.1 &&
              a.startHour + (a.duration ?? 1) <= next.startHour + 0.1,
          )
          if (existingTransport) continue

          const vehicleType = estimate.vehicleType as VehicleType
          const activityId = crypto.randomUUID()

          // Create the transport calendar activity
          const transportActivity: CalendarActivity = {
            id: activityId,
            title: getTransitTitle(estimate.vehicleType, estimate.distanceKm),
            type: 'transport',
            day: prev.day,
            startHour: prevEnd,
            duration,
            latitude: prev.latitude,
            longitude: prev.longitude,
            transitVehicleType: vehicleType,
            sortOrder: (prev.sortOrder ?? 0) + 1,
          }

          // Compute the actual date for this day
          const activityDate = addDays(tripStartDate, prev.day)
          const departureTime = hourToTime(prevEnd)
          const arrivalHour = prevEnd + duration
          const arrivalTime = hourToTime(arrivalHour)

          await addActivity(transportActivity)

          // Create the transit booking
          await addTransit(tripId, {
            trip_id: tripId,
            data: {
              vehicleType,
              provider: null,
              routeName: null,
              originLabel: prev.location ?? prev.title,
              destinationLabel: next.location ?? next.title,
              departureAt: `${activityDate}T${departureTime}:00`,
              arrivalAt: `${activityDate}T${arrivalTime}:00`,
              price: null,
              currency: '',
              bookingRef: null,
              confirmationCode: null,
              notes: null,
            },
          })

          created++
        }
      }
    } catch (err) {
      console.error('[useTransitGapFiller] Error filling transit gaps:', err)
    } finally {
      setIsFilling(false)
      setLastCount(created)
    }

    return created
  }, [activities, tripId, tripStartDate, userId, addActivity])

  return { fillTransitGaps, isFilling, lastCount }
}

function getTransitTitle(vehicleType: string, distanceKm: number): string {
  const label = vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1).replace(/_/g, ' ')
  const dist = distanceKm < 1
    ? `${Math.round(distanceKm * 1000)}m`
    : `${distanceKm.toFixed(1)}km`
  return `${label} · ${dist}`
}
