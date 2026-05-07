'use client'

import { useRef, useState } from 'react'
import type { BudgetItem } from './types'

const PIE_COLORS: Record<string, string> = {
  flights: '#003594',
  hotels: '#C4956A',
  food: '#D4733D',
  activities: '#6B9E8E',
  transportation: '#8B7EC4',
  shopping: '#8FB87A',
  other: '#9CA3AF',
}

function getColor(id: string, name: string): string {
  return PIE_COLORS[id] ?? PIE_COLORS[name.toLowerCase()] ?? PIE_COLORS.other
}

interface BudgetPieChartProps {
  items: BudgetItem[]
  formatAmount: (n: number) => string
}

export function BudgetPieChart({ items, formatAmount }: BudgetPieChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredName, setHoveredName] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{
    name: string
    amount: string
    percent: number
    x: number
    y: number
  } | null>(null)

  const totalActual = items.reduce((s, i) => s + i.actual, 0)
  const totalBudgeted = items.reduce((s, i) => s + i.budgeted, 0)
  const pctUsed = totalBudgeted > 0 ? Math.round((totalActual / totalBudgeted) * 100) : 0

  const segments = items
    .filter((i) => i.actual > 0)
    .map((i) => ({
      id: i.id,
      name: i.category,
      value: i.actual,
      pct: totalActual > 0 ? (i.actual / totalActual) * 100 : 0,
      color: getColor(i.id, i.category),
    }))

  // SVG circle-stroke technique
  const cx = 100; const cy = 100; const r = 82; const sw = 26
  const circ = 2 * Math.PI * r

  let cumPct = 0
  const segData = segments.map((s) => {
    const start = cumPct
    cumPct += s.pct
    const dashLen = (s.pct / 100) * circ
    const dashOff = -((start / 100) * circ)
    // midpoint angle for tooltip position
    const midDeg = (start + s.pct / 2) * 3.6
    const midRad = ((midDeg - 90) * Math.PI) / 180
    const toff = r + 38
    return {
      ...s,
      dashLen,
      dashOff,
      tx: cx + toff * Math.cos(midRad),
      ty: cy + toff * Math.sin(midRad),
    }
  })

  const handleHover = (
    seg: (typeof segData)[0] | null,
    e?: React.MouseEvent,
  ) => {
    if (!seg) {
      setHoveredName(null)
      setTooltip(null)
      return
    }
    setHoveredName(seg.name)
    if (e && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltip({
        name: seg.name,
        amount: formatAmount(seg.value),
        percent: Math.round(seg.pct),
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  // Empty state
  if (segments.length === 0) {
    return (
      <div className="flex items-center justify-center w-full max-w-[200px]">
        <div className="relative w-full aspect-square">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={sw} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] text-gray-400">No data</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center w-full max-w-[210px] shrink-0">
      <div
        ref={containerRef}
        className="relative w-full aspect-square"
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {segData.map((seg) => {
            const isHovered = hoveredName === seg.name
            const anyHovered = hoveredName !== null
            const opacity = anyHovered ? (isHovered ? 1 : 0.2) : 0.8
            return (
              <circle
                key={seg.name}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                strokeWidth={sw}
                strokeLinecap="round"
                strokeDasharray={`${seg.dashLen} ${circ - seg.dashLen}`}
                strokeDashoffset={seg.dashOff}
                style={{
                  stroke: seg.color,
                  opacity,
                  transition: 'opacity 250ms ease, stroke-width 250ms ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => handleHover(seg, e)}
                onMouseMove={(e) => handleHover(seg, e)}
                onMouseLeave={() => handleHover(null)}
              />
            )
          })}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-serif font-normal text-gray-900 tabular-nums">
            {hoveredName && tooltip ? tooltip.percent : pctUsed}
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5">
            {hoveredName && tooltip ? '% of spend' : '% used'}
          </span>
        </div>

        {/* Floating tooltip */}
        {tooltip && hoveredName && (
          <div
            className="absolute pointer-events-none bg-white shadow-lg rounded-lg px-3 py-2 -translate-x-1/2 -translate-y-1/2 z-10 border border-gray-100"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="text-[11px] font-semibold text-gray-900 whitespace-nowrap">
              {tooltip.name}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5 whitespace-nowrap tabular-nums">
              {tooltip.amount} · {tooltip.percent}%
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
