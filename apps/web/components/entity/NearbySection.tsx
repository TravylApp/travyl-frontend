'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { NavArrowLeft, NavArrowRight, StarSolid } from 'iconoir-react'

interface NearbyItem {
  id: string
  name: string
  image: string
  type: string
  rating: number | null
  href: string
}

interface Props {
  title: string
  items: NearbyItem[]
}

export function NearbySection({ title, items }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!items.length) return null

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = 240
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  return (
    <section className="px-6 md:px-10 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">{title}</h2>
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className="w-8 h-8 rounded-full border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/[0.15] hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <NavArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className="w-8 h-8 rounded-full border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/[0.15] hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <NavArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex-shrink-0 w-56 snap-start rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] overflow-hidden group hover:border-gray-300 dark:hover:border-white/[0.15] hover:shadow-md transition-all"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {item.rating != null && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 dark:bg-black/60 backdrop-blur-sm rounded-md px-2 py-0.5">
                  <StarSolid className="w-3 h-3 text-amber-400" />
                  <span className="text-xs font-medium text-gray-900 dark:text-white">{item.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.type}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
