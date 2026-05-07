'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  X, MapPin, Star, Globe, Phone, Clock, ChevronLeft, ChevronRight, ExternalLink,
  CalendarPlus, Loader2, Check, Hourglass, Sun, Ticket, Lightbulb, Accessibility, Compass,
} from 'lucide-react';
import { supabase, mapToDbType, useTripActivities } from '@travyl/shared';
import type { PlaceItem, TripActivityRow } from '@travyl/shared';

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false });

export interface PlaceDetailModalProps {
  place: PlaceItem;
  /** @deprecated favorites UI removed from this modal — kept for caller compat. */
  isFavorited?: boolean;
  /** @deprecated favorites UI removed from this modal — kept for caller compat. */
  onToggleFavorite?: () => void;
  onClose: () => void;
  /** When provided, modal shows an "Add to itinerary" button. */
  tripId?: string;
  /** Trip's start_date (ISO yyyy-mm-dd). Used to compute day options. */
  tripStartDate?: string | null;
  /** Trip's end_date (ISO yyyy-mm-dd). */
  tripEndDate?: string | null;
  /** Open the modal already showing the day-picker timeline, skipping the trigger button. */
  autoAddToItinerary?: boolean;
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
  onClose,
  tripId,
  tripStartDate,
  tripEndDate,
  autoAddToItinerary = false,
}: PlaceDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [addedDay, setAddedDay] = useState<string | null>(null);
  const [showDayPicker, setShowDayPicker] = useState(autoAddToItinerary);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [pickedTime, setPickedTime] = useState<string>('09:00');

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
  const activeDay = tripDays[Math.min(activeDayIdx, tripDays.length - 1)];

  // Existing activities — used to draw the day timeline preview
  const { data: existingActivities } = useTripActivities(tripId);
  const dayActivities = useMemo(
    () => (existingActivities ?? []).filter((a) => a.starting_date === activeDay?.date),
    [existingActivities, activeDay?.date],
  );

  // When the user opens "Add to itinerary," seed start time from the venue's
  // open time but reset back to Day 1.
  useEffect(() => {
    if (showDayPicker) {
      setPickedTime(openTime);
      setActiveDayIdx(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDayPicker]);

  async function addToDay(date: string, dayLabel: string, startTime: string) {
    if (!tripId) return;
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error('Sign in to save activities to your trip.');
        setAdding(false);
        return;
      }
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
        {/* Close */}
        <div className="absolute top-3 right-3 z-20">
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

            {/* Fact chip strip — duration / best time / admission / price level */}
            {(() => {
              const p = place as PlaceItem;
              const facts: { icon: typeof Hourglass; label: string }[] = [];
              if (p.duration) facts.push({ icon: Hourglass, label: p.duration });
              if (p.bestTimeToVisit) facts.push({ icon: Sun, label: p.bestTimeToVisit });
              if (p.admissionFee) facts.push({ icon: Ticket, label: p.admissionFee });
              const priceLevel = detail?.priceLevel ?? p.priceLevel;
              if (priceLevel) facts.push({ icon: Ticket, label: '$'.repeat(priceLevel) });
              if (facts.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-2 mb-6 max-w-3xl">
                  {facts.map((f, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-gray-100 dark:bg-white/[0.04] text-[12px] font-medium text-gray-700 dark:text-white/80"
                    >
                      <f.icon size={12} className="text-gray-400" /> {f.label}
                    </span>
                  ))}
                </div>
              );
            })()}

            {/* Add to itinerary trigger — kept narrow so the button doesn't stretch */}
            {canAddToTrip && !showDayPicker && (
              <div className="mb-5 max-w-3xl">
                {!addedDay && (
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
              </div>
            )}

            {/* Day preview — full width so the timeline gets the entire modal */}
            {canAddToTrip && showDayPicker && activeDay && (
              <div className="mb-5">
                <DayPreview
                  days={tripDays}
                  activeIdx={Math.min(activeDayIdx, tripDays.length - 1)}
                  onActiveIdxChange={(i) => { setActiveDayIdx(i); setPickedTime(openTime); }}
                  pickedTime={pickedTime}
                  onPickedTimeChange={setPickedTime}
                  durationMinutes={durationMinutes}
                  placeName={place.name}
                  activities={dayActivities}
                  adding={adding}
                  onCancel={() => setShowDayPicker(false)}
                  onConfirm={() => addToDay(activeDay.date, activeDay.label, pickedTime)}
                />
              </div>
            )}

            {/* Action / link row — chips size to content and wrap if needed */}
            <div className="flex flex-wrap gap-2">
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 px-3 h-10 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20 text-[12px] font-medium text-gray-700 dark:text-white/80 transition-colors"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <Globe size={13} className="shrink-0 text-gray-400" /> <span className="truncate">Website</span>
                  </span>
                  <ExternalLink size={12} className="shrink-0 text-gray-400" />
                </a>
              )}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 px-3 h-10 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20 text-[12px] font-medium text-gray-700 dark:text-white/80 transition-colors"
                >
                  <Phone size={13} className="shrink-0 text-gray-400" /> <span className="truncate">{phone}</span>
                </a>
              )}
              {hours && (
                <div className="flex items-center gap-2 px-3 h-10 rounded-lg border border-gray-200 dark:border-white/[0.08] text-[12px] text-gray-700 dark:text-white/80">
                  <Clock size={13} className="shrink-0 text-gray-400" />
                  <span className="truncate">{hours}</span>
                </div>
              )}
              {detail?.reservationLink && (
                <a
                  href={detail.reservationLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 px-3 h-10 rounded-lg bg-[#1e3a5f] hover:bg-[#16314f] text-white text-[12px] font-semibold transition-colors"
                >
                  <span>Reserve</span>
                  <ExternalLink size={12} />
                </a>
              )}
              {detail?.menuLink && (
                <a
                  href={detail.menuLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 px-3 h-10 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20 text-[12px] font-medium text-gray-700 dark:text-white/80"
                >
                  <span>View menu</span>
                  <ExternalLink size={12} className="text-gray-400" />
                </a>
              )}
            </div>

            {/* Extra metadata: tips, accessibility, nearby places, tags */}
            {(() => {
              const p = place as PlaceItem;
              const hasTips = (p.tips?.length ?? 0) > 0;
              const hasAccessibility = (p.accessibility?.length ?? 0) > 0;
              const hasNearby = (p.nearbyPlaces?.length ?? 0) > 0;
              const hasTags = (p.tags?.length ?? 0) > 0;
              if (!hasTips && !hasAccessibility && !hasNearby && !hasTags) return null;
              return (
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
                  {hasTips && (
                    <section>
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white/40 mb-2 inline-flex items-center gap-1.5">
                        <Lightbulb size={11} /> Tips
                      </h3>
                      <ul className="space-y-1.5">
                        {p.tips!.map((tip, i) => (
                          <li key={i} className="text-[13px] leading-relaxed text-gray-700 dark:text-white/70 flex items-start gap-2">
                            <span className="text-gray-300 dark:text-white/30 mt-0.5">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {hasAccessibility && (
                    <section>
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white/40 mb-2 inline-flex items-center gap-1.5">
                        <Accessibility size={11} /> Accessibility
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {p.accessibility!.map((a) => (
                          <span key={a} className="text-[12px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.04] text-gray-700 dark:text-white/80">
                            {a}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                  {hasNearby && (
                    <section>
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white/40 mb-2 inline-flex items-center gap-1.5">
                        <Compass size={11} /> Nearby
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {p.nearbyPlaces!.map((n) => (
                          <span key={n} className="text-[12px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.04] text-gray-700 dark:text-white/80">
                            {n}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                  {hasTags && (
                    <section>
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white/40 mb-2">
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {p.tags!.map((t) => (
                          <span key={t} className="text-[12px] px-2.5 py-1 rounded-full border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/70">
                            {t}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlaceDetailModal;

// Day strip ranges from 6:00 AM to 11:00 PM (17h). Times outside that get
// clamped — uncommon for activities. Drawing wider would just shrink everything.
const DAY_START_MIN = 6 * 60;
const DAY_END_MIN = 23 * 60;
const DAY_SPAN_MIN = DAY_END_MIN - DAY_START_MIN;

function timeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const m = t.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Math.max(0, Math.min(24 * 60, parseInt(m[1], 10) * 60 + parseInt(m[2], 10)));
}

function minutesToLabel(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h12 = ((h24 + 11) % 12) + 1;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function clampToDayPct(mins: number): number {
  const clamped = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN, mins));
  return ((clamped - DAY_START_MIN) / DAY_SPAN_MIN) * 100;
}

interface DayPreviewProps {
  days: { date: string; label: string }[];
  activeIdx: number;
  onActiveIdxChange: (i: number) => void;
  pickedTime: string;
  onPickedTimeChange: (t: string) => void;
  durationMinutes: number;
  placeName: string;
  activities: TripActivityRow[];
  adding: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function DayPreview({
  days,
  activeIdx,
  onActiveIdxChange,
  pickedTime,
  onPickedTimeChange,
  durationMinutes,
  placeName,
  activities,
  adding,
  onCancel,
  onConfirm,
}: DayPreviewProps) {
  const activeDay = days[activeIdx];
  const proposedStart = timeToMinutes(pickedTime) ?? DAY_START_MIN + 3 * 60;
  const proposedEnd = proposedStart + durationMinutes;

  const placedActivities = activities
    .map((a) => ({
      a,
      start: timeToMinutes(a.starting_time),
      end: timeToMinutes(a.ending_time),
    }))
    .filter((x): x is { a: TripActivityRow; start: number; end: number } =>
      x.start != null && x.end != null && x.end > x.start,
    );

  const conflicts = placedActivities.filter(
    ({ start, end }) => start < proposedEnd && end > proposedStart,
  );

  // Drag-to-reposition: record start state on pointer-down, resolve to a new
  // start minute on pointer-move (snapped to 15-min increments).
  const stripRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startMins: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const minutesToTimeString = (mins: number) =>
    `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

  const handleSlotPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startMins: proposedStart };
    setIsDragging(true);
  };

  const handleSlotPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const strip = stripRef.current;
    if (!drag || !strip) return;
    const w = strip.getBoundingClientRect().width;
    if (w === 0) return;
    const deltaPx = e.clientX - drag.startX;
    const deltaMins = (deltaPx / w) * DAY_SPAN_MIN;
    const snapped = Math.round((drag.startMins + deltaMins) / 15) * 15;
    const clamped = Math.max(
      DAY_START_MIN,
      Math.min(DAY_END_MIN - durationMinutes, snapped),
    );
    if (clamped !== proposedStart) onPickedTimeChange(minutesToTimeString(clamped));
  };

  const handleSlotPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
  };

  // Hour ticks every 2 hours so the strip stays readable on small modals
  const ticks: number[] = [];
  for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += 120) ticks.push(m);

  const dayPill = (d: { date: string }) => {
    const date = new Date(d.date + 'T12:00:00');
    return {
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      monthDay: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  };

  const dayShort = activeDay.label.split(' · ')[0];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] p-4 bg-white dark:bg-white/[0.02]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[12px] uppercase tracking-[0.12em] font-semibold text-gray-500 dark:text-white/60">
          Where it fits
        </p>
        <span className="text-[11px] text-gray-400 dark:text-white/40 tabular-nums">
          {Math.floor(durationMinutes / 60)}h{durationMinutes % 60 ? ` ${durationMinutes % 60}m` : ''}
        </span>
      </div>

      {/* Day pills — horizontal scrollable */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((d, i) => {
          const { weekday, monthDay } = dayPill(d);
          const active = i === activeIdx;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => onActiveIdxChange(i)}
              className={`shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl border transition-colors ${
                active
                  ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white shadow-sm'
                  : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.08] text-gray-700 dark:text-white/70 hover:border-gray-300 dark:hover:border-white/20'
              }`}
            >
              <span className={`text-[9px] uppercase tracking-wider ${active ? 'text-white/70' : 'text-gray-400 dark:text-white/40'}`}>
                {weekday}
              </span>
              <span className="text-[12px] font-semibold">{monthDay}</span>
            </button>
          );
        })}
      </div>

      {/* Active day caption + start time */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
            {activeDay.label}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-white/50">
            {placedActivities.length === 0
              ? 'Nothing else planned — looks open.'
              : `${placedActivities.length} activit${placedActivities.length === 1 ? 'y' : 'ies'} already planned`}
          </p>
        </div>
        <label className="flex items-center gap-2 text-[11px] font-medium text-gray-500 dark:text-white/60 shrink-0">
          Start
          <input
            type="time"
            value={pickedTime}
            onChange={(e) => onPickedTimeChange(e.target.value)}
            className="px-2 h-8 rounded-md border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-[12px] text-gray-700 dark:text-white/80 focus:outline-none focus:border-[#1e3a5f] dark:focus:border-white/40"
          />
        </label>
      </div>

      {/* Timeline strip */}
      <div
        ref={stripRef}
        className="relative h-20 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] select-none"
      >
        {ticks.map((m) => {
          const pct = clampToDayPct(m);
          return (
            <div key={m} className="absolute top-0 bottom-0" style={{ left: `${pct}%` }}>
              <div className="w-px h-full bg-gray-200 dark:bg-white/[0.06]" />
              <span className="absolute top-full mt-1 -translate-x-1/2 text-[10px] text-gray-400 dark:text-white/40 whitespace-nowrap">
                {minutesToLabel(m)}
              </span>
            </div>
          );
        })}

        {placedActivities.map(({ a, start, end }) => {
          const left = clampToDayPct(start);
          const right = clampToDayPct(end);
          const width = Math.max(2, right - left);
          return (
            <div
              key={a.id}
              className="absolute top-2 bottom-2 rounded-md bg-gray-300/70 dark:bg-white/[0.12] border border-gray-300 dark:border-white/[0.16] px-1.5 flex items-center overflow-hidden"
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${a.activity_name} · ${a.starting_time?.slice(0, 5)}–${a.ending_time?.slice(0, 5)}`}
            >
              <span className="text-[10px] font-medium text-gray-700 dark:text-white/70 truncate">
                {a.activity_name}
              </span>
            </div>
          );
        })}

        {/* Proposed slot — draggable */}
        <div
          role="slider"
          aria-label="Proposed start time"
          aria-valuemin={DAY_START_MIN}
          aria-valuemax={DAY_END_MIN - durationMinutes}
          aria-valuenow={proposedStart}
          tabIndex={0}
          onPointerDown={handleSlotPointerDown}
          onPointerMove={isDragging ? handleSlotPointerMove : undefined}
          onPointerUp={handleSlotPointerUp}
          onPointerCancel={handleSlotPointerUp}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            const step = 15;
            const next = Math.max(
              DAY_START_MIN,
              Math.min(DAY_END_MIN - durationMinutes, proposedStart + (e.key === 'ArrowRight' ? step : -step)),
            );
            onPickedTimeChange(minutesToTimeString(next));
          }}
          className={`absolute top-1.5 bottom-1.5 rounded-md border-2 px-1.5 flex items-center overflow-hidden shadow-sm touch-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#1e3a5f] dark:focus:ring-white/40 ${
            isDragging ? 'cursor-grabbing scale-[1.01]' : 'cursor-grab'
          } ${
            conflicts.length > 0
              ? 'bg-red-500/85 border-red-600 text-white'
              : 'bg-[#1e3a5f] border-[#16314f] text-white'
          }`}
          style={{
            left: `${clampToDayPct(proposedStart)}%`,
            width: `${Math.max(3, clampToDayPct(proposedEnd) - clampToDayPct(proposedStart))}%`,
          }}
          title={`${placeName} · ${minutesToLabel(proposedStart)}–${minutesToLabel(proposedEnd)} · drag to reposition`}
        >
          <span className="text-[10px] font-semibold truncate">{placeName}</span>
        </div>
      </div>

      {/* Slot summary + actions */}
      <div className="mt-7 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[12px] text-gray-600 dark:text-white/70">
            <span className="font-semibold text-gray-900 dark:text-white">
              {minutesToLabel(proposedStart)} – {minutesToLabel(proposedEnd)}
            </span>
            {conflicts.length > 0 && (
              <span className="ml-2 text-red-600 dark:text-red-400">
                · Overlaps {conflicts.length} activit{conflicts.length === 1 ? 'y' : 'ies'}
              </span>
            )}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-white/40 mt-0.5">
            Drag the block, use ← → keys, or pick a time to reposition.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={adding}
            className="px-3 h-9 rounded-lg text-[12px] text-gray-500 hover:text-gray-700 dark:text-white/60 dark:hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={adding}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-[#1e3a5f] hover:bg-[#16314f] text-white text-[12px] font-semibold transition-colors disabled:opacity-60"
          >
            {adding ? <Loader2 size={12} className="animate-spin" /> : <CalendarPlus size={12} />}
            Add to {dayShort}
          </button>
        </div>
      </div>
    </div>
  );
}
