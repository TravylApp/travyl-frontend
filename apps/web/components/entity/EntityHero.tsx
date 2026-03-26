'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  images: string[]
  alt: string
  accentColor?: string
}

export function EntityHero({ images, alt, accentColor }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const hasMultiple = images.length > 1

  if (!images.length) {
    return (
      <div
        className="w-full h-[280px] rounded-xl flex items-center justify-center"
        style={{ backgroundColor: accentColor ? `${accentColor}15` : '#f3f4f6' }}
      >
        <span className="text-gray-400 text-sm">No image available</span>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[280px] rounded-xl overflow-hidden group">
      <img
        src={images[currentIndex]}
        alt={alt}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

      {hasMultiple && (
        <>
          <button
            onClick={() => setCurrentIndex((i) => (i - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentIndex((i) => (i + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
