'use client'

import { useState } from 'react'
import Image from 'next/image'
import { NavArrowLeft, NavArrowRight, StarSolid } from 'iconoir-react'

interface Props {
  images: string[]
  title: string
  overline: string
  rating?: number | null
  reviewCount?: number
  priceLevel?: number | null
  fallbackGradient?: string
}

export function EntityHero({
  images,
  title,
  overline,
  rating,
  reviewCount,
  priceLevel,
  fallbackGradient = 'from-[#1e3a5f] to-[#0f1d30]',
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())

  const validImages = images.filter((_, i) => !failedImages.has(i))
  const hasMultiple = validImages.length > 1
  const currentImage = validImages[currentIndex] ?? null

  const prev = () => setCurrentIndex((i) => (i - 1 + validImages.length) % validImages.length)
  const next = () => setCurrentIndex((i) => (i + 1) % validImages.length)

  const handleImageError = (index: number) => {
    setFailedImages((prev) => new Set(prev).add(index))
    if (currentIndex >= validImages.length - 1) {
      setCurrentIndex(Math.max(0, validImages.length - 2))
    }
  }

  return (
    <div className={`relative w-full aspect-[4/3] md:aspect-[16/9] overflow-hidden group`}>
      {currentImage ? (
        <Image
          src={currentImage}
          alt={title}
          fill
          className="object-cover"
          priority
          onError={() => handleImageError(images.indexOf(currentImage))}
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${fallbackGradient}`} />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f1d30] via-[#0f1d30]/40 to-transparent" />

      {/* Content in lower third */}
      <div className="absolute bottom-0 left-0 right-0 px-6 md:px-10 pb-8 pt-16">
        {/* Overline */}
        <p className="font-sans text-xs uppercase tracking-widest text-white/70 mb-2">
          {overline}
        </p>

        {/* Title */}
        <h1 className="font-serif font-normal tracking-wide text-3xl md:text-5xl text-white mb-4">
          {title}
        </h1>

        {/* Badges row */}
        <div className="flex items-center gap-3">
          {rating != null && (
            <div className="flex items-center gap-1.5 bg-[#1e3a5f]/80 backdrop-blur-sm text-white rounded-lg px-3 py-1.5">
              <StarSolid className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-sm font-medium">{rating.toFixed(1)}</span>
              {reviewCount != null && (
                <span className="text-xs text-white/70">({reviewCount.toLocaleString()})</span>
              )}
            </div>
          )}

          {priceLevel != null && (
            <div className="flex items-center bg-[#1e3a5f]/80 backdrop-blur-sm text-white rounded-lg px-3 py-1.5">
              {[1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  className={`text-sm font-medium ${level <= priceLevel ? 'text-white' : 'text-white/30'}`}
                >
                  $
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Carousel controls */}
      {hasMultiple && (
        <>
          <button
            onClick={prev}
            aria-label="Previous image"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-md"
          >
            <NavArrowLeft className="w-4 h-4 text-gray-900" />
          </button>
          <button
            onClick={next}
            aria-label="Next image"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-md"
          >
            <NavArrowRight className="w-4 h-4 text-gray-900" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-4 right-6 flex gap-1.5">
            {validImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                aria-label={`Go to image ${i + 1}`}
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
