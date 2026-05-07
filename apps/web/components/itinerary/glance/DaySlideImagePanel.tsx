'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  imageUrl: string | null;
  weatherLabel?: string | null;
};

/**
 * Image panel with crossfade between days. Keeps the previous image painted
 * underneath until the new one decodes — eliminates the flash-of-empty-panel
 * during navigation.
 */
export function DaySlideImagePanel({ imageUrl, weatherLabel }: Props) {
  // Stash the previous URL so we can render it underneath while the new one loads.
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(imageUrl);
  const [activeLoaded, setActiveLoaded] = useState(false);
  const lastUrlRef = useRef(imageUrl);

  useEffect(() => {
    if (imageUrl === lastUrlRef.current) return;
    setPrevUrl(lastUrlRef.current);
    setActiveUrl(imageUrl);
    setActiveLoaded(false);
    lastUrlRef.current = imageUrl;
  }, [imageUrl]);

  return (
    <div className="relative overflow-hidden bg-gray-200 dark:bg-gray-900 h-[220px] sm:h-[280px] lg:h-auto lg:min-h-[320px] order-1 lg:order-none">
      {/* Previous image — painted underneath until the new one finishes decoding */}
      {prevUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={prevUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {/* Active image — fades in once decoded */}
      {activeUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={activeUrl}
          src={activeUrl}
          alt=""
          aria-hidden
          decoding="async"
          onLoad={() => {
            setActiveLoaded(true);
            // Drop the previous-image stash once the new one is fully painted.
            // 250ms matches the fade duration below; gives the GPU a beat
            // before we tear down the underlay.
            setTimeout(() => setPrevUrl(null), 260);
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-out ${
            activeLoaded ? 'opacity-100' : 'opacity-0'
          } group-hover/slide:scale-[1.03] motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-[cubic-bezier(.2,.7,.2,1)]`}
        />
      )}
      {/* Bottom gradient for legibility headroom */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/45" />
      {weatherLabel && (
        <div className="absolute top-6 right-6 z-10 bg-white/95 dark:bg-gray-900/90 backdrop-blur-md text-gray-900 dark:text-white px-3.5 py-2 rounded-full text-[13px] font-semibold">
          {weatherLabel}
        </div>
      )}
    </div>
  );
}
