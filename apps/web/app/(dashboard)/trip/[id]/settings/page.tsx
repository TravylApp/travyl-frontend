'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import {
  Save, Trash2, AlertTriangle, Share2,
  Check, X, Globe, GitFork, Copy,
  Home, Calendar, Plane, Building2, UtensilsCrossed, Compass,
  Luggage, PieChart, Heart, Car, Settings2, LogOut, Minus, Plus, Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ThemePicker } from '@/components/trip/ThemePicker';
import { useTripTheme } from '@/components/trip/TripThemeContext';
import {
  useItineraryScreen, useAuthStore, isTripOwner,
  updateTripDetails, updateTripVisibility, updateTripThemeSettings,
  ensureShareLinkToken, deleteTrip, leaveTrip, supabase,
} from '@travyl/shared';
import type { Trip, TravelerMetadata } from '@travyl/shared';
import { useRouter } from 'next/navigation';

// ─── Tab definitions ─────────────────────────────────────────
const CONFIGURABLE_TABS: { segment: string; label: string; icon: LucideIcon; alwaysOn?: boolean }[] = [
  { segment: 'index',       label: 'Overview',    icon: Home,              alwaysOn: true },
  { segment: 'itinerary',   label: 'Itinerary',   icon: Calendar },
  { segment: 'hotels',      label: 'Hotels',      icon: Building2 },
  { segment: 'flights',     label: 'Flights',     icon: Plane },
  { segment: 'restaurants', label: 'Restaurants',  icon: UtensilsCrossed },
  { segment: 'activities',  label: 'Explore',     icon: Compass },
  { segment: 'packing',     label: 'Packing',     icon: Luggage },
  { segment: 'budget',      label: 'Budget',      icon: PieChart },
  { segment: 'cars',        label: 'Car Rental',  icon: Car },
  { segment: 'favorites',   label: 'Favorites',   icon: Heart },
  { segment: 'settings',    label: 'Settings',    icon: Settings2,         alwaysOn: true },
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (\u20ac)' },
  { value: 'GBP', label: 'GBP (\u00a3)' },
  { value: 'JPY', label: 'JPY (\u00a5)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'MXN', label: 'MXN ($)' },
];

const STATUS_OPTIONS = [
  { value: 'planning',  label: 'Planning' },
  { value: 'booked',    label: 'Booked' },
  { value: 'active',    label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'abandoned', label: 'Abandoned' },
];

const FALLBACK_BRAND = '#1e3a5f';

// ─── Reusable small components ────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-serif font-normal text-gray-900 mb-4 tracking-wide">{children}</h2>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>;
}

function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition disabled:bg-gray-50 disabled:text-gray-400"
      style={{ '--tw-ring-color': FALLBACK_BRAND } as React.CSSProperties}
    />
  );
}

function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition disabled:bg-gray-50 disabled:text-gray-400"
      style={{ '--tw-ring-color': FALLBACK_BRAND } as React.CSSProperties}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  enabled,
  onToggle,
  color,
}: {
  enabled: boolean;
  onToggle: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
      style={{ backgroundColor: enabled ? (color ?? FALLBACK_BRAND) : '#d1d5db' }}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out"
        style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  );
}

// ─── Trip Details Section ────────────────────────────────────

function TripDetailsSection({
  details,
  onChange,
  disabled,
}: {
  details: {
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    budget: string;
    currency: string;
    travelers: string;
    status: string;
  };
  onChange: (patch: Partial<typeof details>) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <SectionHeading>Trip Details</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FieldLabel>Trip Name</FieldLabel>
          <Input value={details.title} onChange={(v) => onChange({ title: v })} disabled={disabled} />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Destination</FieldLabel>
          <Input value={details.destination} onChange={(v) => onChange({ destination: v })} disabled={disabled} />
        </div>
        <div>
          <FieldLabel>Start Date</FieldLabel>
          <Input value={details.start_date} onChange={(v) => onChange({ start_date: v })} type="date" disabled={disabled} />
        </div>
        <div>
          <FieldLabel>End Date</FieldLabel>
          <Input value={details.end_date} onChange={(v) => onChange({ end_date: v })} type="date" disabled={disabled} />
        </div>
        <div>
          <FieldLabel>Budget</FieldLabel>
          <Input value={details.budget} onChange={(v) => onChange({ budget: v })} type="number" placeholder="0" disabled={disabled} />
        </div>
        <div>
          <FieldLabel>Currency</FieldLabel>
          <Select value={details.currency} onChange={(v) => onChange({ currency: v })} options={CURRENCY_OPTIONS} disabled={disabled} />
        </div>
        <div>
          <FieldLabel>Travelers</FieldLabel>
          <Input value={details.travelers} onChange={(v) => onChange({ travelers: v })} type="number" placeholder="1" disabled={disabled} />
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <Select value={details.status} onChange={(v) => onChange({ status: v })} options={STATUS_OPTIONS} disabled={disabled} />
        </div>
      </div>
    </div>
  );
}

// ─── Trip Sharing Section ────────────────────────────────────

function TripSharingSection({
  tripId,
  isPublic,
  isShared,
  shareToken,
  forkCount,
  onTogglePublic,
  onToggleShared,
}: {
  tripId: string;
  isPublic: boolean;
  isShared: boolean;
  shareToken: string | null;
  forkCount: number;
  onTogglePublic: () => void;
  onToggleShared: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/trip/${tripId}/share/${shareToken}`
    : '';

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <SectionHeading>Trip Sharing</SectionHeading>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50">
              <Globe size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Make Public</p>
              <p className="text-xs text-gray-500 mt-0.5">Allow anyone to discover and fork this trip</p>
            </div>
          </div>
          <Toggle enabled={isPublic} onToggle={onTogglePublic} />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50">
              <Share2 size={16} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Share Link</p>
              <p className="text-xs text-gray-500 mt-0.5">Generate a link to share with specific people</p>
            </div>
          </div>
          <Toggle enabled={isShared} onToggle={onToggleShared} />
        </div>

        {isShared && shareToken && (
          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <Copy size={14} className="text-gray-500" />
              <p className="text-sm font-medium text-gray-700">Share URL</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs text-gray-600 font-mono truncate">
                {shareUrl}
              </div>
              <button
                onClick={copyShareLink}
                className="shrink-0 text-xs font-medium px-3 py-2 rounded-lg text-white transition"
                style={{ backgroundColor: copied ? '#10b981' : FALLBACK_BRAND }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {forkCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-50">
              <GitFork size={16} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{forkCount} Fork{forkCount === 1 ? '' : 's'}</p>
              <p className="text-xs text-gray-500 mt-0.5">This trip has been forked by other users</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Danger Zone Section ─────────────────────────────────────

function DangerZoneSection({
  isOwner,
  tripTitle,
  onDeleteTrip,
  onLeaveTrip,
}: {
  isOwner: boolean;
  tripTitle: string;
  onDeleteTrip: () => void;
  onLeaveTrip: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const canDelete = confirmText.toLowerCase() === tripTitle.toLowerCase();

  return (
    <div>
      <SectionHeading>Danger Zone</SectionHeading>
      <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-5 space-y-4">
        {isOwner ? (
          <>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} className="text-red-600" />
                <p className="text-sm font-bold text-red-700">Delete Trip</p>
              </div>
              <p className="text-xs text-red-600">
                Permanently delete this trip and all associated data. This action cannot be undone.
              </p>
            </div>

            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
              >
                <Trash2 size={14} />
                Delete Trip
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-red-700 mb-1.5">
                    Type <strong>{tripTitle}</strong> to confirm:
                  </p>
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={tripTitle}
                    className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onDeleteTrip}
                    disabled={!canDelete}
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={14} />
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                    className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <LogOut size={16} className="text-red-600" />
                <p className="text-sm font-bold text-red-700">Leave Trip</p>
              </div>
              <p className="text-xs text-red-600">
                Remove yourself from this trip. You will lose access to all trip data.
              </p>
            </div>
            <button
              onClick={onLeaveTrip}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
            >
              <LogOut size={14} />
              Leave Trip
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Travelers Section ────────────────────────────────────────

const DEFAULT_TRAVELERS: TravelerMetadata = {
  adults: 1,
  children: 0,
  infants: 0,
  child_ages: [],
};

function Stepper({
  value,
  min,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus size={14} />
      </button>
      <span className="w-6 text-center text-sm font-semibold text-gray-900 tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function TravelersSection({
  tripId,
  initialValue,
  disabled,
}: {
  tripId: string;
  initialValue: TravelerMetadata;
  disabled: boolean;
}) {
  const [travelers, setTravelers] = useState<TravelerMetadata>(initialValue);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when initialValue changes (e.g. trip loaded)
  useEffect(() => {
    setTravelers(initialValue);
  }, [initialValue]);

  const save = useCallback(async (next: TravelerMetadata) => {
    setSaving(true);
    try {
      // Fetch the current trip_context to merge travelers in without clobbering other fields
      const { data: current } = await supabase
        .from('trips')
        .select('trip_context')
        .eq('id', tripId)
        .single();

      const existingContext = (current?.trip_context as Record<string, unknown>) ?? {};
      const { error: updateError } = await supabase
        .from('trips')
        .update({
          travelers: next.adults + next.children + next.infants,
          trip_context: { ...existingContext, travelers: next },
        })
        .eq('id', tripId);
      if (updateError) throw updateError;
    } catch (err) {
      console.error('Failed to save traveler metadata:', err);
    } finally {
      setSaving(false);
    }
  }, [tripId]);

  const handleChange = (patch: Partial<TravelerMetadata>) => {
    setTravelers((prev) => {
      const next = { ...prev, ...patch };

      // Keep child_ages array in sync with children count
      if (patch.children !== undefined) {
        const count = patch.children;
        const ages = prev.child_ages.slice(0, count);
        while (ages.length < count) ages.push(0);
        next.child_ages = ages;
      }

      // Debounce auto-save
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save(next), 500);

      return next;
    });
  };

  const handleChildAge = (index: number, age: number) => {
    setTravelers((prev) => {
      const ages = [...prev.child_ages];
      ages[index] = age;
      const next = { ...prev, child_ages: ages };

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save(next), 500);

      return next;
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <SectionHeading>Travelers</SectionHeading>
        {saving && <span className="text-xs text-gray-400 mb-3.5">Saving…</span>}
      </div>

      <div className="space-y-3">
        {/* Adults */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50">
              <Users size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Adults</p>
              <p className="text-xs text-gray-500 mt-0.5">Age 18+</p>
            </div>
          </div>
          <Stepper value={travelers.adults} min={1} onChange={(v) => handleChange({ adults: v })} disabled={disabled} />
        </div>

        {/* Children */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50">
              <Users size={16} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Children</p>
              <p className="text-xs text-gray-500 mt-0.5">Ages 2–17</p>
            </div>
          </div>
          <Stepper value={travelers.children} min={0} onChange={(v) => handleChange({ children: v })} disabled={disabled} />
        </div>

        {/* Child ages — shown only when children > 0 */}
        {travelers.children > 0 && (
          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50 space-y-3">
            <p className="text-xs font-medium text-gray-600">Child ages (optional)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: travelers.children }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 shrink-0">Child {i + 1}</label>
                  <input
                    type="number"
                    min={2}
                    max={17}
                    placeholder="Age"
                    value={travelers.child_ages[i] !== undefined && travelers.child_ages[i] > 0 ? travelers.child_ages[i] : ''}
                    onChange={(e) => handleChildAge(i, e.target.value ? Number(e.target.value) : 0)}
                    disabled={disabled}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition disabled:bg-gray-100 disabled:text-gray-400"
                    style={{ '--tw-ring-color': FALLBACK_BRAND } as React.CSSProperties}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Infants */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-pink-50">
              <Users size={16} className="text-pink-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Infants</p>
              <p className="text-xs text-gray-500 mt-0.5">Under 2</p>
            </div>
          </div>
          <Stepper value={travelers.infants} min={0} onChange={(v) => handleChange({ infants: v })} disabled={disabled} />
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Total: {travelers.adults + travelers.children + travelers.infants} traveler{travelers.adults + travelers.children + travelers.infants === 1 ? '' : 's'}
      </p>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { trip, isLoading: tripLoading, refetch } = useItineraryScreen(id);
  const user = useAuthStore((s) => s.user);
  const isOwner = trip ? isTripOwner(trip, user?.id ?? null) : false;

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Appearance — driven by shared TripThemeContext ───
  const {
    theme, themeId, customColor,
    setTripTheme,
    tabColorOverrides, setTabColor, resetTabColors,
    itineraryColorOverrides, setItineraryColor, resetItineraryColors,
    hiddenTabs, setTabHidden,
  } = useTripTheme();

  // ── Trip details state ──
  const [details, setDetails] = useState({
    title: '',
    destination: '',
    start_date: '',
    end_date: '',
    budget: '',
    currency: 'USD',
    travelers: '1',
    status: 'planning',
  });

  // ── Trip sharing state ──
  const [isPublic, setIsPublic] = useState(false);
  const [isShared, setIsShared] = useState(false);

  // Sync state from loaded trip
  useEffect(() => {
    if (trip) {
      setDetails({
        title: trip.title ?? '',
        destination: trip.destination ?? '',
        start_date: trip.start_date ?? '',
        end_date: trip.end_date ?? '',
        budget: trip.budget != null ? String(trip.budget) : '',
        currency: trip.currency ?? 'USD',
        travelers: trip.travelers != null ? String(trip.travelers) : '1',
        status: trip.status ?? 'planning',
      });
      setIsPublic(trip.visibility === 'public');
      setIsShared(trip.visibility !== 'private');
    }
  }, [trip]);

  const markDirty = useCallback(() => setDirty(true), []);

  const updateDetails = (patch: Partial<typeof details>) => {
    setDetails((prev) => ({ ...prev, ...patch }));
    markDirty();
  };

  // ── Save all changes ──
  const handleSave = async () => {
    if (!trip) return;
    setSaving(true);
    try {
      // Save trip details
      await updateTripDetails(trip.id, {
        title: details.title,
        destination: details.destination,
        start_date: details.start_date,
        end_date: details.end_date,
        budget: details.budget ? Number(details.budget) : null,
        currency: details.currency,
        travelers: details.travelers ? Number(details.travelers) : 1,
        status: details.status as Trip['status'],
      });

      // Save theme settings
      await updateTripThemeSettings(trip.id, {
        theme: themeId,
        custom_theme_color: customColor,
        tab_color_overrides: tabColorOverrides,
        itinerary_color_overrides: itineraryColorOverrides,
        hidden_tabs: hiddenTabs,
      });

      setDirty(false);
      refetch();
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (trip) {
      setDetails({
        title: trip.title ?? '',
        destination: trip.destination ?? '',
        start_date: trip.start_date ?? '',
        end_date: trip.end_date ?? '',
        budget: trip.budget != null ? String(trip.budget) : '',
        currency: trip.currency ?? 'USD',
        travelers: trip.travelers != null ? String(trip.travelers) : '1',
        status: trip.status ?? 'planning',
      });
    }
    setDirty(false);
  };

  // ── Sharing handlers ──
  const handleTogglePublic = async () => {
    if (!trip || !isOwner) return;
    try {
      const newVisibility = isPublic ? 'private' : 'public';
      await updateTripVisibility(trip.id, newVisibility as 'private' | 'public');
      setIsPublic(!isPublic);
      if (newVisibility === 'public') setIsShared(true);
      refetch();
    } catch {
      alert('Failed to update trip visibility');
    }
  };

  const handleToggleShared = async () => {
    if (!trip || !isOwner) return;
    try {
      if (!isShared) {
        await ensureShareLinkToken(trip.id);
        await updateTripVisibility(trip.id, 'link');
        setIsShared(true);
      } else {
        await updateTripVisibility(trip.id, 'private');
        setIsShared(false);
        setIsPublic(false);
      }
      refetch();
    } catch {
      alert('Failed to update sharing settings');
    }
  };

  // ── Danger zone handlers ──
  const handleDeleteTrip = async () => {
    if (!trip) return;
    try {
      await deleteTrip(trip.id);
      router.push('/trips');
    } catch {
      alert('Failed to delete trip');
    }
  };

  const handleLeaveTrip = async () => {
    if (!trip || !user) return;
    try {
      await leaveTrip(trip.id, user.id);
      router.push('/trips');
    } catch {
      alert('Failed to leave trip');
    }
  };

  if (tripLoading && !trip) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-gray-400 text-sm">
        Loading settings...
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-gray-500 mb-4">Trip not found or you don't have access.</p>
        <button onClick={() => router.push('/trips')} className="text-sm text-blue-600 hover:underline">
          Back to trips
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 divide-y divide-gray-200">
      {/* Theme & Colors */}
      <section className="py-8 first:pt-0">
        <SectionHeading>Theme & Colors</SectionHeading>
        <ThemePicker
          currentTheme={themeId}
          customColor={customColor}
          onSelectTheme={(tid, color) => { setTripTheme(tid, color); markDirty(); }}
          tabColors={theme.tabColors}
          tabColorOverrides={tabColorOverrides}
          onTabColorChange={(name, color) => { setTabColor(name, color); markDirty(); }}
          onResetTabColors={() => { resetTabColors(); markDirty(); }}
          itineraryColors={theme.itineraryColors}
          itineraryColorOverrides={itineraryColorOverrides}
          onItineraryColorChange={(section, color) => { setItineraryColor(section, color); markDirty(); }}
          onResetItineraryColors={() => { resetItineraryColors(); markDirty(); }}
        />
      </section>

      {/* Manage Tabs */}
      <section className="py-8">
        <SectionHeading>Manage Tabs</SectionHeading>
        <p className="text-sm text-gray-500 mb-4">Choose which tabs appear in your trip navigation.</p>
        <div className="space-y-1">
          {CONFIGURABLE_TABS.map(({ segment, label, icon: Icon, alwaysOn }) => {
            const isEnabled = !hiddenTabs[segment];
            const tabColor = tabColorOverrides[segment] ?? theme.tabColors[segment] ?? theme.base;
            return (
              <div key={segment} className="flex items-center justify-between rounded-xl p-3.5 hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: isEnabled ? tabColor : '#d1d5db' }}>
                    <Icon size={14} style={{ color: theme.textOnBase }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    {alwaysOn && <p className="text-[11px] text-gray-400">Always visible</p>}
                  </div>
                </div>
                {alwaysOn ? (
                  <div className="text-xs font-medium text-gray-400 px-2 py-1 rounded-full bg-gray-100">Required</div>
                ) : (
                  <Toggle enabled={isEnabled} onToggle={() => { setTabHidden(segment, isEnabled); markDirty(); }} color={theme.base} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Trip Details */}
      <section className="py-8">
        <TripDetailsSection details={details} onChange={updateDetails} disabled={!isOwner} />
      </section>

      {/* Travelers */}
      {trip && (
        <section className="py-8">
          <TravelersSection
            tripId={trip.id}
            initialValue={trip.trip_context?.travelers ?? DEFAULT_TRAVELERS}
            disabled={!isOwner}
          />
        </section>
      )}

      {/* Trip Sharing — owner only */}
      {isOwner && (
        <section className="py-8">
          <TripSharingSection
            tripId={id}
            isPublic={isPublic}
            isShared={isShared}
            shareToken={trip?.share_link_token ?? null}
            forkCount={trip?.fork_count ?? 0}
            onTogglePublic={handleTogglePublic}
            onToggleShared={handleToggleShared}
          />
        </section>
      )}

      {/* Danger Zone */}
      <section className="py-8">
        <DangerZoneSection
          isOwner={isOwner}
          tripTitle={trip?.title ?? ''}
          onDeleteTrip={handleDeleteTrip}
          onLeaveTrip={handleLeaveTrip}
        />
      </section>

      {/* Floating save bar */}
      {dirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-xl">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <AlertTriangle size={14} className="text-amber-500" />
            Unsaved changes
          </div>
          <button
            onClick={handleDiscard}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
          >
            <X size={14} />
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: theme.base, color: theme.textOnBase }}
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
