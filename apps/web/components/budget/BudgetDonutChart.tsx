'use client'

import { useState, useRef } from 'react'
import type { BudgetCategoryData } from '@travyl/shared'
import { getCategoryColor } from './budgetColors'

interface DonutTooltip {
  name: string
  amount: string
  percent: string
  x: number
  y: number
}

interface BudgetDonutChartProps {
  categories: BudgetCategoryData[]
  hoveredCategory: string | null
  onHoverCategory: (name: string | null) => void
  formatAmount: (amount: number) => string
}

export function BudgetDonutChart({
  categories,
  hoveredCategory,
  onHoverCategory,
  formatAmount,
}: BudgetDonutChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<DonutTooltip | null>(null)

  const totalSpent = categories.reduce((sum, c) => sum + c.actual, 0)
  const totalBudgeted = categories.reduce((sum, c) => sum + c.budgeted, 0)
  const percentUsed = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

  // SVG constants
  const cx = 100
  const cy = 100
  const r = 80
  const circumference = 2 * Math.PI * r
  const tooltipOffset = 40

  // Compute segments
  const segments = categories
    .filter((c) => c.actual > 0)
    .map((c) => ({
      name: c.name,
      value: c.actual,
      percent: totalSpent > 0 ? (c.actual / totalSpent) * 100 : 0,
      color: getCategoryColor(c.name),
    }))

  // Build dash offsets
  let cumulativePercent = 0
  const segmentData = segments.map((seg) => {
    const startPercent = cumulativePercent
    cumulativePercent += seg.percent
    const dashLength = (seg.percent / 100) * circumference
    const dashOffset = -((startPercent / 100) * circumference)

    // Midpoint angle for tooltip positioning (0° = top)
    const midAngleDeg = (startPercent + seg.percent / 2) * 3.6
    const midAngleRad = ((midAngleDeg - 90) * Math.PI) / 180
    const tooltipX = cx + (r + tooltipOffset) * Math.cos(midAngleRad)
    const tooltipY = cy + (r + tooltipOffset) * Math.sin(midAngleRad)

    return { ...seg, dashLength, dashOffset, tooltipX, tooltipY }
  })

  const handleSegmentHover = (seg: (typeof segmentData)[0] | null) => {
    if (!seg) {
      onHoverCategory(null)
      setTooltip(null)
      return
    }
    onHoverCategory(seg.name)

    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const svgSize = 200
    const scaleX = rect.width / svgSize
    const scaleY = rect.height / svgSize
    let x = seg.tooltipX * scaleX
    let y = seg.tooltipY * scaleY

    const pad = 8
    x = Math.max(pad, Math.min(rect.width - pad, x))
    y = Math.max(pad, Math.min(rect.height - pad, y))

    setTooltip({
      name: seg.name,
      amount: formatAmount(seg.value),
      percent: `${Math.round(seg.percent)}%`,
      x,
      y,
    })
  }

  // Empty state
  if (segments.length === 0) {
    return (
      <div className="flex items-center justify-center">
        <div className="relative w-full max-w-[280px] aspect-square">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={28} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm text-gray-400">No budget</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <div ref={containerRef} className="relative w-full max-w-[280px] aspect-square">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {segmentData.map((seg) => {
            const isHovered = hoveredCategory === seg.name
            const isAnyHovered = hoveredCategory !== null
            const opacity = isAnyHovered ? (isHovered ? 1 : 0.25) : 0.75
            const brightness = isHovered ? 'brightness(1.05)' : 'brightness(1)'

            return (
              <circle
                key={seg.name}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                strokeWidth={28}
                strokeLinecap="round"
                strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                strokeDashoffset={seg.dashOffset}
                style={{
                  stroke: seg.color,
                  opacity,
                  filter: brightness,
                  transition: 'opacity 200ms ease-out, filter 200ms ease-out',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => handleSegmentHover(seg)}
                onMouseLeave={() => handleSegmentHover(null)}
              />
            )
          })}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-serif font-normal text-gray-900">{percentUsed}</span>
          <span className="text-xs text-gray-400">% used</span>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-white shadow-md rounded-full px-3 py-1.5 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap z-10"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              opacity: 1,
              transition: 'opacity 150ms, transform 150ms',
            }}
          >
            <span className="text-xs font-medium text-gray-700">
              {tooltip.name} · {tooltip.amount} · {tooltip.percent}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
