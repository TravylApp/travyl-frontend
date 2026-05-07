'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  X, Heart, MapPin, Star, Globe, Phone, Clock, ChevronLeft, ChevronRight, ExternalLink,
  CalendarPlus, Loader2, Check,
} from 'lucide-react';
import { supabase, mapToDbType } from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false });

export interface PlaceDetailModalProps {
  place: PlaceItem;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  onClose: () => void;
  /** When provided, modal shows an "Add to itinerary" button. */
  tripId?: string;
  /** Trip's start_date (ISO yyyy-mm-dd). Used to compute day options. */
  tripStartDate?: string | null;
  /** Trip's end_date (ISO yyyy-mm-dd). */
  tripEndDate?: string | null;
}

/**
 * Parses strings like "1h 15m", "2 hours", "30 min" → minutes.
 * Falls back to 120 for unrecognized input.
 */
function parseDurationMinutes(duration?: string): number {
  if (!duration) return 120;
  const d = duration.toLowerCase();
  const hMatch = d.match(/(\d+(?:\.\d+)?)\s*h(?:our)?s?/);
  const mMatch = d.match(/(\d+)\s*m(?:in)?/);
  let mins = 0;
  if (hMatch) mins += Math.round(parseFloat(hMatch[1]) * 60);
  if (mMatch) mins += parseInt(mMatch[1], 10);
  if (!hMatch && !mMatch) {
    // Try standalone number e.g. "90" or "1.5 hours" without a unit form we caught
    const plain = d.match(/(\d+(?:\.\d+)?)/);
    if (plain) mins = Math.round(parseFloat(plain[1]) * 60);
  }
  return mins > 0 && mins <= 480 ? mins : 120;
}

/**
 * Parses a time-of-day from a hours string like "Today: 5 PM–2 AM" or "9 AM-5 PM".
 * Returns "HH:MM" 24h format, or null when unparseable.
 */
function parseOpenTime(hours?: string): string | null {
  if (!hours) return null;
  const m = hours.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const isPM = /pm/i.test(m[3]);
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  if (h < 0 || h > 23) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function addMinutesToTime(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const endH = Math.min(23, Math.floor(total / 60));
  const endM = Math.min(59, total % 60);
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function buildTripDays(start?: string | null, end?: string | null): { date: string; label: string }[] {
  if (!start || !end) return [];
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return [];
  const out: { date: string; label: string }[] = [];
  const d = new Date(s);
  let i = 1;
  while (d <= e && i <= 30) {
    out.push({
      date: d.toISOString().split('T')[0],
      label: `Day ${i} · ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
    });
    d.setDate(d.getDate() + 1);
    i++;
  }
  return out;
}

interface PlaceDetail {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
  hours?: string;
  allHours?: Array<Record<string, string>>;
  rating?: number;
  reviewCount?: number;
  latitude?: number | null;
  longitude?: number | null;
  type?: string[];
  priceLevel?: number | null;
  menuLink?: string | null;
  reservationLink?: string | null;
  orderOnlineLink?: string | null;
  photos?: Array<{ image?: string; thumbnail?: string }>;
  reviews?: Array<{ user?: string; rating?: number; snippet?: string; date?: string }>;
}

async function fetchPlaceDetail(name: string, address?: string): Promise<PlaceDetail | null> {
  const q = address ? `${name} ${address}` : name;
  try {
    const res = await fetch(`/api/search/place-detail?q=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    return (await res.json()) as PlaceDetail;
  } catch {
    return null;
  }
}

export function PlaceDetailModal({
  place,
  isFavorited,
  onToggleFavorite,
  onClose,
  tripId,
  tripStartDate,
  tripEndDate,
}: PlaceDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [addedDay, setAddedDay] = useState<string | null>(null);
  const [showDayPicker, setShowDayPicker] = useState(false);

  // Lock scroll on body while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setImgIdx((i) => i + 1);
      if (e.key === 'ArrowLeft') setImgIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Focus trap (basic) — focus the dialog on open
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Pull metadata
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['place-detail', place.id, place.name],
    queryFn: () => fetchPlaceDetail(place.name, place.address),
    staleTime: 60 * 60 * 1000,
  });

  // Merge images from PlaceItem and detail.photos
  const images = useMemo<string[]>(() => {
    const out: string[] = [];
    const push = (u?: string) => {
      if (u && !out.includes(u)) out.push(u);
    };
    push(place.image);
    (place.images ?? []).forEach((u) => push(u));
    (detail?.photos ?? []).forEach((p) => push(p.image || p.thumbnail));
    return out.filter(Boolean);
  }, [place, detail]);

  const safeIdx = images.length === 0 ? 0 : ((imgIdx % images.length) + images.length) % images.length;
  const currentImage = images[safeIdx];

  const lat = detail?.latitude ?? place.latitude ?? null;
  const lng = detail?.longitude ?? place.longitude ?? null;
  const hasCoords = typeof lat === 'number' && typeof lng === 'number';

  const description = detail?.description || place.description || '';
  const address = detail?.address || place.address || '';
  const website = detail?.website || place.website || '';
  const phone = detail?.phone || '';
  const hours = detail?.hours || (place as { hours?: string }).hours || '';
  const rating = detail?.rating ?? place.rating ?? 0;
  const reviewCount = detail?.reviewCount ?? place.reviewCount ?? 0;
  const category = place.category || (detail?.type?.[0] ?? '');

  // Derived itinerary defaults
  const durationMinutes = useMemo(
    () => parseDurationMinutes((place as { duration?: string }).duration),
    [place],
  );
  const openTime = useMemo(() => parseOpenTime(hours) || '09:00', [hours]);
  const tripDays = useMemo(
    () => buildTripDays(tripStartDate, tripEndDate),
    [tripStartDate, tripEndDate],
  );
  const canAddToTrip = !!tripId && tripDays.length > 0;

  async function addToDay(date: string, dayLabel: string) {
    if (!tripId) return;
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error('Sign in to save activities to your trip.');
        setAdding(false);
        return;
      }
      const startTime = openTime;
      const endTime = addMinutesToTime(startTime, durationMinutes);
      const { error } = await supabase.from('activity').insert({
        trip_id: tripId,
        user_id: user.id,
        activity_name: place.name,
        activity_type: mapToDbType(place.type || 'other'),
        starting_date: date,
        ending_date: date,
        starting_time: startTime,
        ending_time: endTime,
        latitude: typeof lat === 'number' ? lat : 0,
        longitude: typeof lng === 'number' ? lng : 0,
        sort_order: 0,
        notes: description || '',
        activity_data: {
          image_url: place.image || (place.images?.[0] ?? ''),
          category: place.category || place.type || '',
          location_name: place.name,
          rating,
          tags: place.tags,
        },
      });
      if (error) {
        toast.error(`Couldn't add to trip: ${error.message}`);
        setAdding(false);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['trip-activities', tripId] });
      setAddedDay(dayLabel);
      setShowDayPicker(false);
      toast.success(`Added "${place.name}" to ${dayLabel}`);
    } catch (err) {
      toast.error('Something went wrong adding the activity.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={place.name}
    >
      {/* Backdrop — clickable but not in the tab order; the X button below is the a11y close */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl bg-white dark:bg-[#0c1117] shadow-2xl flex flex-col focus:outline-none"
      >
        {/* Header strip with close + favorite */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
              className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
                isFavorited ? 'bg-red-500 text-white' : 'bg-white/85 dark:bg-black/55 text-gray-700 dark:text-white hover:bg-white'
              }`}
            >
              <Heart size={15} className={isFavorited ? 'fill-current' : ''} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/85 dark:bg-black/55 text-gray-700 dark:text-white hover:bg-white backdrop-blur-md"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Top half: image carousel + map split on lg */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Image carousel */}
            <div className="relative h-[260px] sm:h-[320px] lg:h-[420px] bg-gray-100 dark:bg-white/[0.04]">
              {currentImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={currentImage}
                  src={currentImage}
                  alt={place.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <MapPin size={32} />
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setImgIdx((i) => i - 1)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-gray-800 flex items-center justify-center shadow"
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImgIdx((i) => i + 1)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-gray-800 flex items-center justify-center shadow"
                  >
                    <ChevronRight size={17} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          i === safeIdx ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Map */}
            <div className="relative h-[220px] sm:h-[260px] lg:h-[420px] bg-gray-100 dark:bg-white/[0.04]">
              {hasCoords ? (
                <LeafletMap lat={lat!} lng={lng!} label={place.name} height="100%" zoom={14} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <MapPin size={28} />
                  <span className="text-xs">Location coordinates unavailable</span>
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="px-5 sm:px-8 lg:px-10 py-6 sm:py-8">
            {category && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1e3a5f] dark:text-white/60 mb-2">
                {category}
              </p>
            )}
            <h2 className="font-serif text-[28px] sm:text-[34px] font-normal text-gray-900 dark:text-white tracking-tight leading-[1.1] mb-3">
              {place.name}
            </h2>

            {/* Stat row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-gray-600 dark:text-white/60 mb-5">
              {rating > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-gray-900 dark:text-white">{rating.toFixed(1)}</span>
                  {reviewCount > 0 && <span className="text-gray-400">({reviewCount.toLocaleString()})</span>}
                </span>
              )}
              {detail?.priceLevel && (
                <span>{'$'.repeat(detail.priceLevel)}</span>
              )}
              {address && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} />
                  <span>{address}</span>
                </span>
              )}
            </div>

            {/* Description */}
            {description && (
              <p className="text-[15px] leading-relaxed text-gray-700 dark:text-white/80 mb-6 max-w-3xl">
                {description}
              </p>
            )}

            {/* Loading state for detail metadata */}
            {detailLoading && !description && (
              <div className="space-y-2 mb-6 max-w-3xl">
                <div className="h-3 bg-gray-100 dark:bg-white/[0.04] rounded animate-pulse" />
                <div className="h-3 bg-gray-100 dark:bg-white/[0.04] rounded animate-pulse w-11/12" />
                <div className="h-3 bg-gray-100 dark:bg-white/[0.04] rounded animate-pulse w-3/4" />
              </div>
            )}

            {/* Add to itinerary — only when launched from a trip context */}
            {canAddToTrip && (
              <div className="mb-5 max-w-3xl">
                {!showDayPicker && !addedDay && (
                  <button
                    type="button"
                    onClick={() => setShowDayPicker(true)}
                    disabled={adding}
                    className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-[#1e3a5f] text-white text-[14px] font-semibold hover:bg-[#16314f] transition-colors disabled:opacity-60"
                  >
                    <CalendarPlus size={15} /> Add to itinerary
                    {(place as { duration?: string }).duration && (
                      <span className="text-[12px] font-normal text-white/70 ml-1">
                        · {(place as { duration?: string }).duration}
                      </span>
                    )}
                  </button>
                )}
                {addedDay && (
                  <div className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/[0.12] text-emerald-700 dark:text-emerald-400 text-[13px] font-semibold">
                    <Check size={15} /> Added to {addedDay}
                    <button
                      type="button"
                      onClick={() => { setAddedDay(null); setShowDayPicker(true); }}
                      className="ml-2 text-[12px] font-medium underline hover:no-underline"
                    >
                      Add another day
                    </button>
                  </div>
                )}
                {showDayPicker && (
                  <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] p-4 bg-white dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[12px] uppercase tracking-[0.12em] font-semibold text-gray-500 dark:text-white/60">
                        Pick a day
                      </p>
                      <span className="text-[11px] text-gray-400">
                        Slot: {openTime} · {Math.floor(durationMinutes / 60)}h {durationMinutes % 60 ? `${durationMinutes % 60}m` : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tripDays.map((d) => (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => addToDay(d.date, d.label)}
                          disabled={adding}
                          className="px-3 h-9 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:border-[#1e3a5f] dark:hover:border-white/40 text-[12px] font-semibold text-gray-700 dark:text-white/80 transition-colors disabled:opacity-50"
                        >
                          {adding ? <Loader2 size={12} className="animate-spin" /> : d.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowDayPicker(false)}
                        className="px-3 h-9 rounded-lg text-[12px] text-gray-500 hover:text-gray-700 dark:text-white/60 dark:hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action / link grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 px-4 h-11 rounded-xl border border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20 text-[13px] font-semibold text-gray-700 dark:text-white/80 transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <Globe size={14} /> Website
                  </span>
                  <ExternalLink size={13} className="text-gray-400" />
                </a>
              )}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 px-4 h-11 rounded-xl border border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20 text-[13px] font-semibold text-gray-700 dark:text-white/80 transition-colors"
                >
                  <Phone size={14} /> {phone}
                </a>
              )}
              {hours && (
                <div className="flex items-center gap-2 px-4 h-11 rounded-xl border border-gray-200 dark:border-white/[0.08] text-[13px] text-gray-700 dark:text-white/80">
                  <Clock size={14} />
                  <span className="truncate">{hours}</span>
                </div>
              )}
              {detail?.reservationLink && (
                <a
                  href={detail.reservationLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 px-4 h-11 rounded-xl bg-[#1e3a5f] hover:bg-[#16314f] text-white text-[13px] font-semibold transition-colors"
                >
                  <span>Reserve</span>
                  <ExternalLink size={13} />
                </a>
              )}
              {detail?.menuLink && (
                <a
                  href={detail.menuLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 px-4 h-11 rounded-xl border border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20 text-[13px] font-semibold text-gray-700 dark:text-white/80"
                >
                  <span>View menu</span>
                  <ExternalLink size={13} />
                </a>
              )}
            </div>

            {/* Reviews preview */}
            {detail?.reviews && detail.reviews.length > 0 && (
              <div className="mt-8 max-w-3xl">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 mb-3">
                  Recent reviews
                </h3>
                <div className="space-y-3">
                  {detail.reviews.slice(0, 3).map((r, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 dark:border-white/[0.06] p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{r.user || 'Guest'}</span>
                        {typeof r.rating === 'number' && (
                          <span className="inline-flex items-center gap-0.5 text-[12px] text-gray-500 dark:text-white/60">
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            {r.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {r.snippet && <p className="text-[13px] text-gray-700 dark:text-white/70 leading-relaxed">{r.snippet}</p>}
                      {r.date && <p className="text-[11px] text-gray-400 mt-1.5">{r.date}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlaceDetailModal;
