'use client';

import { useRef, useEffect } from 'react';
import { Cloud, Droplets, Sun } from 'lucide-react';
import { formatDateRange } from '@travyl/shared';
import type { Trip } from '@travyl/shared';

function QuickFactRow({ facts, className }: { facts: (string | undefined)[]; className?: string }) {
  const valid = facts.filter(Boolean) as string[];
  if (!valid.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] ${className ?? ''}`}
      style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
      {valid.map((fact, i) => {
        const [label, ...rest] = fact.split(' · ');
        return (
          <span key={i} className="text-white/80">
            <span className="font-semibold text-white">{label}</span>
            {rest.length > 0 && ` · ${rest.join(' · ')}`}
          </span>
        );
      })}
    </div>
  );
}

export function TripMagazineHero({ trip }: { tripId?: string; trip?: Trip | null }) {
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

  const weather = trip?.trip_context?.weather?.current;
  const forecast = trip?.trip_context?.weather?.forecast;
  const coverImage = trip?.trip_context?.hero_image_url;
  const destination = trip?.destination || 'Destination';
  const cityName = destination.split(',')[0].trim();
  const countryName = destination.split(',').slice(1).join(',').trim();
  const dateStr = trip ? formatDateRange(trip.start_date, trip.end_date) : null;
  const travelersStr = trip ? `${trip.travelers} ${trip.travelers === 1 ? 'traveler' : 'travelers'}` : null;

  const conditions = weather?.condition?.toLowerCase() ?? '';
  const WeatherIcon = conditions.includes('cloud') ? Cloud : conditions.includes('rain') ? Droplets : Sun;

  const hasEssentials = !!(trip?.trip_context?.quick_facts || weather);

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
      {hasEssentials && (
        <div className="relative z-10 px-6 sm:px-10 mb-6">
          {trip?.trip_context?.quick_facts && (() => {
            const qf = trip.trip_context.quick_facts!;
            return (
              <>
                <QuickFactRow facts={[qf.currency, qf.language, qf.timezone, qf.power]} className="mb-3" />
                <QuickFactRow facts={[qf.transport, qf.taxi, qf.tipping, qf.water]} className="mb-5" />
                {qf.emergency && (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] mb-5" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                    <span className="text-white/60"><span className="font-semibold text-red-400">{qf.emergency}</span> Emergency</span>
                  </div>
                )}
              </>
            );
          })()}

          <div className="flex items-center gap-5 sm:gap-7 text-[12px] tracking-wider uppercase overflow-x-auto scrollbar-hide">
            {weather && (
              <span className="flex items-center gap-2 shrink-0 font-semibold" style={{ color: 'var(--magazine-accent, #c8a96a)' }}>
                <WeatherIcon size={16} />
                <span className="font-bold">{weather.high}° / {weather.low}°</span>
                <span className="text-[10px]" style={{ opacity: 0.7 }}>Now</span>
              </span>
            )}
            {weather && forecast && forecast.length > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            )}
            {forecast && forecast.length > 0 && (
              forecast.slice(0, 5).map((d) => (
                <span key={d.day} className="flex items-center gap-1.5 shrink-0">
                  <span className="font-semibold" style={{ color: 'var(--magazine-text, var(--muted-foreground))' }}>{d.day}</span>
                  <span className="text-[14px]">{d.icon}</span>
                  <span className="font-bold" style={{ color: 'var(--magazine-heading, var(--foreground))' }}>{d.high}°</span>
                </span>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
