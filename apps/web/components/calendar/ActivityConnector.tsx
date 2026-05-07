'use client'
import { motion } from 'motion/react'
import { Walking, Car, ArrowDown } from 'iconoir-react'

interface ActivityConnectorProps {
  /** Pixel offset from top of the column to the bottom of the previous activity */
  top: number
  /** Pixel height of the connector (bottom of prev → top of next) */
  height: number
  travelTimeMinutes?: number
  distanceKm?: number
  gapMinutes?: number
  hasConflict?: boolean
}

export function ActivityConnector({
  top,
  height,
  travelTimeMinutes,
  distanceKm,
  gapMinutes,
  hasConflict,
}: ActivityConnectorProps) {
  // Don't render for tiny gaps
  if (height < 8) return null

  const showBadge = travelTimeMinutes !== undefined && height > 32
  const Icon = distanceKm !== undefined && distanceKm >= 2 ? Car : Walking

  return (
    <div
      className="absolute pointer-events-none z-[1]"
      style={{ top, left: 11, height, width: 16 }}
    >
      {/* Vertical connector line — animated draw-in */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="absolute top-0 left-1/2 w-px origin-top -translate-x-1/2"
        style={{
          height: '100%',
          backgroundColor: 'var(--cal-border)',
        }}
      />

      {/* Arrow tip at bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.2 }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center"
        style={{ width: 10, height: 8 }}
      >
        <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
          <path d="M5 7L0 0H10L5 7Z" fill="var(--cal-text-secondary)" opacity="0.4" />
        </svg>
      </motion.div>

      {/* Badge */}
      {showBadge && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.2 }}
          className="absolute left-0 -translate-y-1/2 flex items-center gap-1"
          style={{ top: '50%' }}
        >
          {hasConflict ? (
            <span className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap shadow-sm">
              <Icon width={10} height={10} />
              ⚠ {travelTimeMinutes}min
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-white/90 text-gray-500 border border-gray-200 whitespace-nowrap shadow-sm backdrop-blur-sm">
              <Icon width={10} height={10} />
              {travelTimeMinutes}min
              {gapMinutes !== undefined && gapMinutes > travelTimeMinutes && (
                <span className="text-gray-300">· {gapMinutes - travelTimeMinutes}m spare</span>
              )}
            </span>
          )}
        </motion.div>
      )}
    </div>
  )
}
