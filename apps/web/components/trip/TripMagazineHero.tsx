'use client';

import { useRef, useEffect, useState } from 'react';
import { Cloud, Droplets, Sun, ChevronDown } from 'lucide-react';
import { formatDateRange, useExchangeRates } from '@travyl/shared';
import type { Trip } from '@travyl/shared';

function QuickFactRow({ facts, className }: { facts: (string | undefined)[]; className?: string }) {
  const valid = facts.filter(Boolean) as string[];
  if (!valid.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] ${className ?? ''}`}
      style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.3)' }}>
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

function useQuote() {
  const [quote, setQuote] = useState<{ content: string; author: string } | null>(null);
  useEffect(() => {
    fetch('/api/quote?tag=travel')
      .then((r) => r.json())
      .then((d) => { if (d?.content) setQuote(d); })
      .catch(() => {});
  }, []);
  return quote;
}

export function TripMagazineHero({ tripId, trip, overrideImage }: { tripId?: string; trip?: Trip | null; overrideImage?: string }) {
  const bgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        el.style.transform = `translateY(${window.scrollY * 0.15}px)`;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const [essentialsOpen, setEssentialsOpen] = useState(true);
  const weather = trip?.trip_context?.weather?.current;
  const forecast = trip?.trip_context?.weather?.forecast;
  const rawCover = overrideImage || trip?.trip_context?.hero_image_url;
  const coverImage = rawCover?.includes('googleusercontent.com')
    ? rawCover.replace(/=w\d+-h\d+[^&]*/, '=w1600-h1000-k-no')
    : rawCover;
  const destination = trip?.destination || 'Destination';
  const cityName = destination.split(',')[0].trim();
  const countryName = destination.split(',').slice(1).join(',').trim();
  const dateStr = trip?.start_date && trip?.end_date ? formatDateRange(trip.start_date, trip.end_date) : null;
  const travelersStr = trip ? `${trip.travelers} ${trip.travelers === 1 ? 'traveler' : 'travelers'}` : null;

  const conditions = weather?.conditions?.toLowerCase() ?? '';
  const WeatherIcon = conditions.includes('cloud') ? Cloud : conditions.includes('rain') ? Droplets : Sun;

  const quote = useQuote();
  const wiki = trip?.trip_context?.wiki;

  // Currency conversion — inline with quick facts
  const destCurrency = trip?.trip_context?.country?.currency;
  const tripCurrency = trip?.currency || 'USD';
  const { rates } = useExchangeRates(tripCurrency);
  const destCode = destCurrency?.code;
  const exchangeRate = destCode && rates ? rates[destCode] : null;
  const sameCurrency = destCode === tripCurrency;

  // Build exchange rate fact string: "1 USD = 0.92 EUR"
  const exchangeFact = exchangeRate && !sameCurrency && destCode
    ? `1 ${tripCurrency} · = ${destCurrency?.symbol ?? ''}${exchangeRate.toFixed(2)} ${destCode}`
    : undefined;

  const hasEssentials = !!(trip?.trip_context?.quick_facts || weather || wiki || quote || exchangeFact);

  return (
    <>
      {/* Background image — bleeds behind nav and all content */}
      {coverImage && (
        <div className="absolute inset-x-0 top-0 z-0 pointer-events-none overflow-hidden" style={{ height: '120vh' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={bgRef} src={coverImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover"
            style={{ objectPosition: 'center 30%', willChange: 'transform' }} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.3) 15%, rgba(0,0,0,0.4) 35%, rgba(0,0,0,0.5) 50%, var(--magazine-bg, var(--background)) 70%, var(--magazine-bg, var(--background)) 100%)' }} />
        </div>
      )}

      {/* Hero text — aligned with content area (max-w-7xl + spine offset) */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 md:pl-24 pt-[68px] pb-4">
        <p className="text-[10px] tracking-[0.4em] uppercase font-semibold mb-1" style={{ color: 'var(--magazine-accent, #c8a96a)' }}>
          {countryName || 'Your Trip Guide'}
        </p>
        <div className="flex items-center gap-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[0.95] font-serif"
            style={{ letterSpacing: '0.02em', textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
            {cityName.toUpperCase()}
          </h1>
          {hasEssentials && (
            <button
              onClick={() => setEssentialsOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all shrink-0"
              style={{
                backgroundColor: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <span>{essentialsOpen ? 'Hide Info' : 'Trip Info'}</span>
              <ChevronDown size={10} className={`transition-transform ${essentialsOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Collapsible trip info */}
      {hasEssentials && (
        <div className={`relative z-10 max-w-7xl mx-auto px-6 sm:px-10 md:pl-24 transition-all duration-300 ${essentialsOpen ? 'mb-6' : 'mb-0'}`}>
          <div className={`transition-all duration-300 overflow-hidden ${essentialsOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>

            {/* Dates + travelers */}
            <div className="flex items-center gap-4 text-[14px] sm:text-[15px] text-white/80 font-medium mb-4">
              {dateStr && <span>{dateStr}</span>}
              {dateStr && travelersStr && <span className="text-white/30">&middot;</span>}
              {travelersStr && <span>{travelersStr}</span>}
            </div>

            {/* Quick facts — currency + exchange rate sits inline with language/timezone */}
            {(trip?.trip_context?.quick_facts || exchangeFact) && (() => {
              const qf = trip?.trip_context?.quick_facts;
              return (
                <>
                  <QuickFactRow facts={[qf?.currency, exchangeFact, qf?.language, qf?.timezone, qf?.power]} className="mb-3" />
                  <QuickFactRow facts={[qf?.transport, qf?.taxi, qf?.tipping, qf?.water]} className="mb-5" />
                  {qf?.emergency && (
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] mb-5" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                      <span className="text-white/60"><span className="font-semibold text-red-400">{qf.emergency}</span> Emergency</span>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Weather + forecast */}
            <div className="flex items-center gap-5 sm:gap-7 text-[12px] tracking-wider uppercase overflow-x-auto scrollbar-hide">
              {weather && (
                <span className="flex items-center gap-2 shrink-0 font-semibold" style={{ color: 'var(--magazine-accent, #c8a96a)' }}>
                  <WeatherIcon size={16} />
                  <span className="font-bold">{weather.temp}&deg;</span>
                  <span className="text-[10px]" style={{ opacity: 0.7 }}>{weather.conditions}</span>
                </span>
              )}
              {weather && forecast && forecast.length > 0 && (
                <span className="text-white/40">|</span>
              )}
              {forecast && forecast.length > 0 && (
                forecast.slice(0, 5).map((d) => {
                  const day = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                  const icon = d.icon?.includes('rain') ? '\u{1F327}' : d.icon?.includes('cloud') ? '\u2601\uFE0F' : d.icon?.includes('snow') ? '\u2744\uFE0F' : '\u2600\uFE0F';
                  return (
                    <span key={d.date} className="flex items-center gap-1.5 shrink-0">
                      <span className="font-semibold text-white/70">{day}</span>
                      <span className="text-[14px]">{icon}</span>
                      <span className="font-bold text-white">{d.high}&deg;</span>
                    </span>
                  );
                })
              )}
            </div>

            {/* Wiki + Quote */}
            {(wiki?.extract || quote) && (
              <div className="mt-5 pt-5 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', textShadow: 'none' }}>
                {wiki?.extract && (
                  <p className="text-[13px] sm:text-[14px] leading-[1.7] text-white/60 font-serif line-clamp-3">
                    {wiki.extract}
                  </p>
                )}
                {quote && (
                  <blockquote className="pl-3" style={{ borderLeft: '2px solid var(--magazine-accent, #c8a96a)' }}>
                    <p className="text-[12px] sm:text-[13px] font-serif italic leading-[1.6] text-white/65">
                      &ldquo;{quote.content}&rdquo;
                    </p>
                    <cite className="block mt-1 text-[10px] not-italic tracking-wider uppercase font-semibold" style={{ color: 'var(--magazine-accent, #c8a96a)', opacity: 0.7 }}>
                      &mdash; {quote.author}
                    </cite>
                  </blockquote>
                )}
              </div>
            )}

          </div>{/* end collapsible */}
        </div>
      )}
    </>
  );
}
