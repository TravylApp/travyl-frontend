'use client';

import { useRef, useEffect } from 'react';
import { Cloud, Droplets, Sun } from 'lucide-react';
import { formatDateRange, MOCK_WEATHER, MOCK_WEATHER_FORECAST, MOCK_TRIPS } from '@travyl/shared';
import type { Trip } from '@travyl/shared';

export function TripMagazineHero({ tripId, trip }: { tripId: string; trip?: Trip | null }) {
  const bgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    const handleScroll = () => {
      el.style.transform = `translateY(${window.scrollY * 0.15}px)`;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const weather = MOCK_WEATHER;
  const forecast = MOCK_WEATHER_FORECAST;
  const tripData = MOCK_TRIPS.find((t) => t.id === (trip?.id ?? tripId));
  const coverImage = (trip as any)?.image?.replace(/\?w=\d+/, '?w=1600&q=80')
    || tripData?.image?.replace(/\?w=\d+/, '?w=1600&q=80');
  const destination = trip?.destination || tripData?.destination || 'Paris, France';
  const cityName = destination.split(',')[0].trim();
  const countryName = destination.split(',').slice(1).join(',').trim();
  const dateStr = trip ? formatDateRange(trip.start_date, trip.end_date) : null;
  const travelersStr = trip ? `${trip.travelers} ${trip.travelers === 1 ? 'traveler' : 'travelers'}` : null;

  const conditions = weather.conditions.toLowerCase();
  const WeatherIcon = conditions.includes('cloud') ? Cloud : conditions.includes('rain') ? Droplets : Sun;

  return (
    <>
      {/* Background image — bleeds behind nav and all content */}
      {coverImage && (
        <div className="absolute inset-x-0 top-0 z-0 pointer-events-none overflow-hidden" style={{ height: '120vh' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={bgRef} src={coverImage} alt="" className="w-full h-full object-cover"
            style={{ objectPosition: 'center 30%', willChange: 'transform' }} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.5) 60%, var(--magazine-bg, var(--background)) 85%, var(--magazine-bg, var(--background)) 100%)' }} />
        </div>
      )}

      {/* Hero text */}
      <div className="relative z-10 px-6 sm:px-10 pt-[68px] pb-4">
        <p className="text-[10px] tracking-[0.4em] uppercase font-semibold mb-1" style={{ color: 'var(--magazine-accent, #c8a96a)' }}>
          {countryName || 'Your Trip Guide'}
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[0.95] font-serif mb-3"
          style={{ letterSpacing: '0.02em', textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
          {cityName.toUpperCase()}
        </h1>
        <div className="flex items-center gap-4 text-[14px] sm:text-[15px] text-white/70 font-medium">
          {dateStr && <span>{dateStr}</span>}
          {dateStr && travelersStr && <span className="text-white/20">·</span>}
          {travelersStr && <span>{travelersStr}</span>}
        </div>
      </div>

      {/* Essentials + forecast */}
      <div className="relative z-10 px-6 sm:px-10 mb-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] mb-3"
          style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
          <span className="text-white/80"><span className="font-semibold text-white">EUR €</span> · €1 ≈ $1.08</span>
          <span className="text-white/80"><span className="font-semibold text-white">French</span> · English widely spoken</span>
          <span className="text-white/80"><span className="font-semibold text-white">CET +1</span> · 6h ahead of EST</span>
          <span className="text-white/80"><span className="font-semibold text-white">Type C/E</span> · 230V adapter</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] mb-5"
          style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
          <span className="text-white/80"><span className="font-semibold text-white">Métro</span> · Lines 1, 4 & 7</span>
          <span className="text-white/80"><span className="font-semibold text-white">Taxi</span> · Airport €50–70</span>
          <span className="text-white/80"><span className="font-semibold text-white">Tip</span> · Included, round up</span>
          <span className="text-white/80"><span className="font-semibold text-white">Water</span> · Tap is safe</span>
          <span className="text-white/60"><span className="font-semibold text-red-400">112</span> Emergency</span>
        </div>

        <div className="flex items-center gap-5 sm:gap-7 text-[12px] tracking-wider uppercase overflow-x-auto scrollbar-hide">
          <span className="flex items-center gap-2 shrink-0 font-semibold" style={{ color: 'var(--magazine-accent, #c8a96a)' }}>
            <WeatherIcon size={16} />
            <span className="font-bold">{weather.high}° / {weather.low}°</span>
            <span className="text-[10px]" style={{ opacity: 0.7 }}>Now</span>
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
          {forecast.slice(0, 5).map((d) => (
            <span key={d.day} className="flex items-center gap-1.5 shrink-0">
              <span className="font-semibold" style={{ color: 'var(--magazine-text, var(--muted-foreground))' }}>{d.day}</span>
              <span className="text-[14px]">{d.icon}</span>
              <span className="font-bold" style={{ color: 'var(--magazine-heading, var(--foreground))' }}>{d.high}°</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
