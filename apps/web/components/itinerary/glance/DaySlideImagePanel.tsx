'use client';

type Props = {
  imageUrl: string | null;
  weatherLabel?: string | null;  // e.g. "☀ 78°"
};

export function DaySlideImagePanel({ imageUrl, weatherLabel }: Props) {
  return (
    <div className="relative overflow-hidden bg-gray-900 min-h-[320px]">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)] group-hover/slide:scale-[1.03]"
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
