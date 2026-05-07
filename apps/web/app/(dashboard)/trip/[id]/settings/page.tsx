'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import {
  Trash2, Share2, Globe, GitFork, Copy, Lock, Link as LinkIcon,
  Home, Calendar, CalendarDays, Plane, Building2, Compass,
  Luggage, PieChart, Car, LogOut, Minus, Plus, Users,
  Loader2, Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ThemePicker } from '@/components/trip/ThemePicker';
import { useTripTheme } from '@/components/trip/TripThemeContext';
import { Module } from '@/components/trip/Module';
import {
  useItineraryScreen, useAuthStore, isTripOwner,
  updateTripDetails, updateTripVisibility, updateTripThemeSettings,
  ensureShareLinkToken, deleteTrip, leaveTrip, supabase,
} from '@travyl/shared';
import type { Trip, TravelerMetadata } from '@travyl/shared';
import { useRouter } from 'next/navigation';

// Aligned with TripRail.ALL_TABS so toggling here actually hides the tab in the rail.
const CONFIGURABLE_TABS: { segment: string; label: string; icon: LucideIcon }[] = [
  { segment: 'overview',   label: 'Overview',   icon: Home },
  { segment: 'itinerary',  label: 'Itinerary',  icon: Calendar },
  { segment: 'calendar',   label: 'Calendar',   icon: CalendarDays },
  { segment: 'hotels',     label: 'Hotels',     icon: Building2 },
  { segment: 'flights',    label: 'Flights',    icon: Plane },
  { segment: 'cars',       label: 'Cars',       icon: Car },
  { segment: 'activities', label: 'Explore',    icon: Compass },
  { segment: 'packing',    label: 'Packing',    icon: Luggage },
  { segment: 'budget',     label: 'Budget',     icon: PieChart },
];

const DEFAULT_TRAVELERS: TravelerMetadata = { adults: 1, children: 0, infants: 0, child_ages: [] };

// ─── Field primitives ────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">{children}</label>;
}

function Input({
  value, onChange, type = 'text', placeholder, disabled,
}: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] px-4 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--trip-base,#1e3a5f)]/20 focus:border-[var(--trip-base,#1e3a5f)]/50 transition disabled:bg-gray-50 disabled:text-gray-400 dark:disabled:bg-white/[0.02] dark:disabled:text-gray-500"
    />
  );
}

function Select({
  value, onChange, options, disabled,
}: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] px-4 text-[14px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--trip-base,#1e3a5f)]/20 focus:border-[var(--trip-base,#1e3a5f)]/50 transition disabled:bg-gray-50 disabled:text-gray-400 dark:disabled:bg-white/[0.02] dark:disabled:text-gray-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="dark:bg-gray-900 dark:text-white">{o.label}</option>
      ))}
    </select>
  );
}

function Toggle({ enabled, onToggle, color }: { enabled: boolean; onToggle: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${!enabled ? 'bg-gray-300 dark:bg-white/[0.15]' : ''}`}
      style={enabled ? { backgroundColor: color ?? 'var(--trip-base, #1e3a5f)' } : undefined}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out"
        style={{ transform: enabled ? 'translate(20px, 2px)' : 'translate(2px, 2px)' }}
      />
    </button>
  );
}

function Stepper({
  value, min, onChange, disabled,
}: {
  value: number; min: number; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="w-9 h-9 rounded-xl border border-gray-200 dark:border-white/[0.10] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus size={14} />
      </button>
      <span className="w-7 text-center text-[15px] font-semibold text-gray-900 dark:text-white tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        className="w-9 h-9 rounded-xl border border-gray-200 dark:border-white/[0.10] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function PrimaryButton({
  onClick, disabled, busy, children, icon,
}: {
  onClick: () => void; disabled?: boolean; busy?: boolean; children: React.ReactNode; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-5 h-11 rounded-xl text-[14px] font-semibold transition-all disabled:bg-gray-200 dark:disabled:bg-white/[0.06] disabled:text-gray-400 disabled:cursor-not-allowed text-white shadow-sm hover:shadow-md"
      style={!disabled ? { backgroundColor: 'var(--trip-base, #1e3a5f)' } : undefined}
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ─── Travelers (auto-save preserved) ────────────────────────

function TravelersControls({
  tripId, initialValue, disabled,
}: {
  tripId: string; initialValue: TravelerMetadata; disabled: boolean;
}) {
  const [travelers, setTravelers] = useState<TravelerMetadata>(initialValue);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setTravelers(initialValue); }, [initialValue]);

  const save = useCallback(async (next: TravelerMetadata) => {
    setSaving(true);
    try {
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
      setSavedFlash(true);
      if (flashRef.current) clearTimeout(flashRef.current);
      flashRef.current = setTimeout(() => setSavedFlash(false), 1500);
    } catch {
      toast.error('Failed to update travelers');
    } finally {
      setSaving(false);
    }
  }, [tripId]);

  const handleChange = (patch: Partial<TravelerMetadata>) => {
    setTravelers((prev) => {
      const next = { ...prev, ...patch };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save(next), 500);
      return next;
    });
  };

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (flashRef.current) clearTimeout(flashRef.current);
  }, []);

  const total = travelers.adults + travelers.children + travelers.infants;
  const status = saving
    ? (<><Loader2 size={12} className="animate-spin" /> Saving</>)
    : savedFlash
      ? (<><Check size={12} className="text-emerald-600" /> Saved</>)
      : (<>{total} {total === 1 ? 'traveler' : 'travelers'}</>);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end text-[12px] text-gray-500 dark:text-gray-400 gap-1.5 -mt-1 mb-1">
        {status}
      </div>
      <TravelerRow
        label="Adults" sublabel="Age 18+"
        value={travelers.adults} min={1} disabled={disabled}
        onChange={(v) => handleChange({ adults: v })}
      />
      <TravelerRow
        label="Children" sublabel="Ages 2 to 17"
        value={travelers.children} min={0} disabled={disabled}
        onChange={(v) => handleChange({ children: v })}
      />
      <TravelerRow
        label="Infants" sublabel="Under 2"
        value={travelers.infants} min={0} disabled={disabled}
        onChange={(v) => handleChange({ infants: v })}
      />
    </div>
  );
}

function TravelerRow({
  label, sublabel, value, min, disabled, onChange,
}: {
  label: string; sublabel: string;
  value: number; min: number; disabled: boolean; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4 transition-colors hover:border-gray-300 dark:hover:border-white/[0.16]">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/[0.06] shrink-0">
          <Users size={18} className="text-gray-500 dark:text-gray-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">{label}</p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">{sublabel}</p>
        </div>
      </div>
      <Stepper value={value} min={min} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────

export default function TripSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { trip, isLoading: tripLoading, refetch } = useItineraryScreen(id);
  const user = useAuthStore((s) => s.user);

  const isOwner = trip ? (
    isTripOwner(trip, user?.id ?? null) ||
    (!user && typeof window !== 'undefined' && (() => {
      try { const ids = JSON.parse(localStorage.getItem('my-trip-ids') || '[]'); return ids.includes(id); } catch { return false; }
    })())
  ) : false;

  const {
    theme, themeId, customColor,
    setTripTheme,
    tabColorOverrides, setTabColor, resetTabColors,
    itineraryColorOverrides, setItineraryColor, resetItineraryColors,
    hiddenTabs, setTabHidden,
  } = useTripTheme();

  const blankDetails = {
    title: '', destination: '', start_date: '', end_date: '',
    budget: '',
  };
  const [details, setDetails] = useState(blankDetails);
  const [originalDetails, setOriginalDetails] = useState(blankDetails);
  const detailsDirty = JSON.stringify(details) !== JSON.stringify(originalDetails);
  const [savingDetails, setSavingDetails] = useState(false);

  const [appearanceDirty, setAppearanceDirty] = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const markAppearance = useCallback(() => setAppearanceDirty(true), []);

  const [visibility, setVisibility] = useState<'private' | 'link' | 'public'>('private');
  const [linkPermission, setLinkPermission] = useState<'viewer' | 'editor'>('viewer');
  const [shareToken, setShareToken] = useState<string | null>(null);

  useEffect(() => {
    if (trip) {
      const next = {
        title: trip.title ?? '',
        destination: trip.destination ?? '',
        start_date: trip.start_date ?? '',
        end_date: trip.end_date ?? '',
        budget: trip.budget != null ? String(trip.budget) : '',
      };
      setDetails(next);
      setOriginalDetails(next);
      const v = (trip.visibility ?? 'private') as 'private' | 'link' | 'public';
      setVisibility(v);
      setLinkPermission(trip.link_permission ?? 'viewer');
      setShareToken(trip.share_link_token ?? null);
    }
  }, [trip]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (detailsDirty || appearanceDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [detailsDirty, appearanceDirty]);

  const handleSaveDetails = async () => {
    if (!trip) return;
    setSavingDetails(true);
    try {
      await updateTripDetails(trip.id, {
        title: details.title,
        destination: details.destination,
        start_date: details.start_date,
        end_date: details.end_date,
        budget: details.budget ? Number(details.budget) : null,
      });
      setOriginalDetails(details);
      refetch();
      toast.success('Trip details saved');
    } catch {
      toast.error('Failed to save trip details');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSaveAppearance = async () => {
    if (!trip) return;
    setSavingAppearance(true);
    try {
      await updateTripThemeSettings(trip.id, {
        theme: themeId,
        custom_theme_color: customColor,
        tab_color_overrides: tabColorOverrides,
        itinerary_color_overrides: itineraryColorOverrides,
        hidden_tabs: hiddenTabs,
      });
      setAppearanceDirty(false);
      refetch();
      toast.success('Appearance saved');
    } catch {
      toast.error('Failed to save appearance');
    } finally {
      setSavingAppearance(false);
    }
  };

  const handleChangeVisibility = async (next: 'private' | 'link' | 'public') => {
    if (!trip || !isOwner || next === visibility) return;
    const previous = visibility;
    setVisibility(next); // optimistic
    try {
      if (next === 'link' || next === 'public') {
        // Make sure a token exists before persisting visibility, so the URL is renderable immediately.
        const token = await ensureShareLinkToken(trip.id);
        if (token) setShareToken(token);
      }
      if (next === 'public') {
        await updateTripVisibility(trip.id, 'public');
      } else if (next === 'link') {
        await updateTripVisibility(trip.id, 'link', linkPermission);
      } else {
        await updateTripVisibility(trip.id, 'private');
      }
      refetch();
      toast.success(
        next === 'public' ? 'Trip is now public'
          : next === 'link' ? 'Share link enabled'
          : 'Trip is now private'
      );
    } catch {
      setVisibility(previous);
      toast.error('Failed to update sharing');
    }
  };

  const handleChangeLinkPermission = async (permission: 'viewer' | 'editor') => {
    if (!trip || !isOwner) return;
    try {
      await updateTripVisibility(trip.id, 'link', permission);
      setLinkPermission(permission);
      refetch();
      toast.success(`Link recipients can now ${permission === 'editor' ? 'edit' : 'view'}`);
    } catch {
      toast.error('Failed to update link permission');
    }
  };

  const handleDeleteTrip = async () => {
    if (!trip) return;
    try {
      await deleteTrip(trip.id);
      router.push('/trips');
    } catch {
      toast.error('Failed to delete trip');
    }
  };

  const handleLeaveTrip = async () => {
    if (!trip || !user) return;
    try {
      await leaveTrip(trip.id, user.id);
      router.push('/trips');
    } catch {
      toast.error('Failed to leave trip');
    }
  };

  if (tripLoading && !trip) {
    return (
      <div className="max-w-7xl mx-auto py-24 text-center">
        <Loader2 size={20} className="animate-spin mx-auto text-gray-400" />
        <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">Loading settings</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Trip not found or you don&apos;t have access.</p>
        <button onClick={() => router.push('/trips')} className="text-sm font-medium text-[var(--trip-base,#1e3a5f)] hover:underline">
          Back to trips
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Details */}
          <Module
            className="lg:col-span-7"
            title="Details"
            description="Name, destination, dates, and budget."
            action={isOwner && detailsDirty ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setDetails(originalDetails)}
                  disabled={savingDetails}
                  className="text-[13px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50 px-3 h-9"
                >
                  Discard
                </button>
                <PrimaryButton onClick={handleSaveDetails} disabled={savingDetails} busy={savingDetails}>
                  {savingDetails ? 'Saving' : 'Save'}
                </PrimaryButton>
              </div>
            ) : null}
          >
            <div className="grid grid-cols-1 md:grid-cols-6 gap-x-5 gap-y-4">
              <div className="md:col-span-6">
                <FieldLabel>Trip name</FieldLabel>
                <Input value={details.title} onChange={(v) => setDetails({ ...details, title: v })} disabled={!isOwner} />
              </div>
              <div className="md:col-span-6">
                <FieldLabel>Destination</FieldLabel>
                <Input value={details.destination} onChange={(v) => setDetails({ ...details, destination: v })} disabled={!isOwner} />
              </div>
              <div className="md:col-span-3">
                <FieldLabel>Start date</FieldLabel>
                <Input type="date" value={details.start_date} onChange={(v) => setDetails({ ...details, start_date: v })} disabled={!isOwner} />
              </div>
              <div className="md:col-span-3">
                <FieldLabel>End date</FieldLabel>
                <Input type="date" value={details.end_date} onChange={(v) => setDetails({ ...details, end_date: v })} disabled={!isOwner} />
              </div>
              <div className="md:col-span-6">
                <FieldLabel>Budget</FieldLabel>
                <Input type="number" placeholder="0" value={details.budget} onChange={(v) => setDetails({ ...details, budget: v })} disabled={!isOwner} />
              </div>
            </div>
          </Module>

          {/* Travelers */}
          <Module
            className="lg:col-span-5"
            title="Travelers"
            description="Saved automatically as you adjust the count."
          >
            <TravelersControls
              tripId={trip.id}
              initialValue={trip.trip_context?.travelers ?? DEFAULT_TRAVELERS}
              disabled={!isOwner}
            />
          </Module>

          {/* Sharing - owner only */}
          {isOwner && (
            <Module
              className="lg:col-span-12"
              title="Sharing"
              description="Control who can find or join this trip. Saves instantly."
            >
              <SharingControls
                tripId={trip.id}
                visibility={visibility}
                shareToken={shareToken}
                linkPermission={linkPermission}
                forkCount={trip.fork_count ?? 0}
                onChangeVisibility={handleChangeVisibility}
                onChangeLinkPermission={handleChangeLinkPermission}
              />
            </Module>
          )}

          {/* Appearance */}
          <Module
            className="lg:col-span-12"
            title="Appearance"
            description="Theme, accent colors, and which tabs show in this trip's nav."
            action={isOwner && appearanceDirty ? (
              <div className="shrink-0">
                <PrimaryButton onClick={handleSaveAppearance} disabled={savingAppearance} busy={savingAppearance}>
                  {savingAppearance ? 'Saving' : 'Save'}
                </PrimaryButton>
              </div>
            ) : null}
          >
            <div className="space-y-10">
              <ThemePicker
                currentTheme={themeId}
                customColor={customColor}
                onSelectTheme={(tid, color) => { setTripTheme(tid, color); markAppearance(); }}
                tabColors={theme.tabColors}
                tabColorOverrides={tabColorOverrides}
                onTabColorChange={setTabColor}
                onResetTabColors={resetTabColors}
                itineraryColors={theme.itineraryColors}
                itineraryColorOverrides={itineraryColorOverrides}
                onItineraryColorChange={setItineraryColor}
                onResetItineraryColors={resetItineraryColors}
              />

              <div>
                <h3 className="text-[22px] font-serif font-normal text-gray-900 dark:text-white tracking-tight leading-tight mb-1.5">Visible tabs</h3>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-5">
                  Choose which tabs appear in this trip&apos;s navigation.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {CONFIGURABLE_TABS.map(({ segment, label, icon: Icon }) => {
                    const isEnabled = !hiddenTabs[segment];
                    return (
                      <div key={segment} className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-3.5 hover:border-gray-300 dark:hover:border-white/[0.16] transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/[0.06]">
                            <Icon size={16} className={isEnabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
                          </div>
                          <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">{label}</p>
                        </div>
                        <Toggle
                          enabled={isEnabled}
                          onToggle={() => { setTabHidden(segment, isEnabled); markAppearance(); }}
                          color={theme.base}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Module>

          {/* Manage trip */}
          <Module
            className="lg:col-span-12"
            title="Manage trip"
            description="Delete this trip if you own it, or leave if you were invited."
          >
            <ManageControls
              isOwner={isOwner}
              onDeleteTrip={handleDeleteTrip}
              onLeaveTrip={handleLeaveTrip}
            />
          </Module>
        </div>
      </div>
    </div>
  );
}

// ─── Sharing ─────────────────────────────────────────────────

const VISIBILITY_OPTIONS: {
  id: 'private' | 'link' | 'public';
  label: string;
  description: string;
  icon: typeof Lock;
}[] = [
  { id: 'private', label: 'Private', description: 'Only you and invited collaborators',  icon: Lock },
  { id: 'link',    label: 'Link',    description: 'Anyone with the link can open it',    icon: LinkIcon },
  { id: 'public',  label: 'Public',  description: 'Discoverable and forkable by anyone', icon: Globe },
];

function SharingControls({
  tripId, visibility, shareToken, linkPermission, forkCount,
  onChangeVisibility, onChangeLinkPermission,
}: {
  tripId: string;
  visibility: 'private' | 'link' | 'public';
  shareToken: string | null;
  linkPermission: 'viewer' | 'editor';
  forkCount: number;
  onChangeVisibility: (next: 'private' | 'link' | 'public') => void;
  onChangeLinkPermission: (permission: 'viewer' | 'editor') => void;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/trip/${tripId}/share/${shareToken}`
    : '';
  const linkVisible = visibility !== 'private' && !!shareUrl;

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link. Copy it manually.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {VISIBILITY_OPTIONS.map(({ id, label, description, icon: Icon }) => {
          const active = visibility === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChangeVisibility(id)}
              className={`text-left rounded-2xl border p-4 transition-colors ${
                active
                  ? 'border-[var(--trip-base,#1e3a5f)]/40 bg-[var(--trip-base,#1e3a5f)]/[0.06] dark:bg-white/[0.04]'
                  : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/[0.16]'
              }`}
            >
              <div className="flex items-center gap-3 mb-1.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? 'bg-[var(--trip-base,#1e3a5f)] text-white' : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400'}`}>
                  <Icon size={16} />
                </div>
                <p className="text-[15px] font-semibold text-gray-900 dark:text-white">{label}</p>
                {active && <Check size={16} className="ml-auto text-[var(--trip-base,#1e3a5f)] dark:text-white" />}
              </div>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">{description}</p>
            </button>
          );
        })}
      </div>

      {linkVisible && (
        <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] p-5 bg-gray-50/60 dark:bg-white/[0.02] space-y-3">
          <div className="flex items-center gap-2">
            <LinkIcon size={14} className="text-gray-500 dark:text-gray-400" />
            <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Share link</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] px-3 h-10 flex items-center text-[12px] text-gray-600 dark:text-gray-300 font-mono truncate">
              {shareUrl}
            </div>
            <select
              value={linkPermission}
              onChange={(e) => onChangeLinkPermission(e.target.value as 'viewer' | 'editor')}
              className="shrink-0 text-[13px] font-medium px-3 h-10 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--trip-base,#1e3a5f)]/20"
            >
              <option value="viewer">Can view</option>
              <option value="editor">Can edit</option>
            </select>
            <button
              onClick={copyShareLink}
              className="shrink-0 flex items-center gap-1.5 text-[13px] font-semibold px-4 h-10 rounded-lg text-white transition-all"
              style={{ backgroundColor: copied ? '#10b981' : 'var(--trip-base, #1e3a5f)' }}
            >
              <Copy size={14} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">
            Recipients can {linkPermission === 'editor' ? 'edit and join the trip' : 'view only'}.
          </p>
        </div>
      )}

      {forkCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/[0.06] shrink-0">
            <GitFork size={16} className="text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{forkCount} fork{forkCount === 1 ? '' : 's'}</p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">This trip has been forked by other users.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SharingRow({
  title, subtitle, icon, toggle,
}: {
  title: string; subtitle: string; icon: React.ReactNode; toggle?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-5 transition-colors hover:border-gray-300 dark:hover:border-white/[0.16]">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/[0.06]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">{title}</p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>
        </div>
      </div>
      {toggle}
    </div>
  );
}

// ─── Manage trip ─────────────────────────────────────────────

function ManageControls({
  isOwner, onDeleteTrip, onLeaveTrip,
}: {
  isOwner: boolean; onDeleteTrip: () => void; onLeaveTrip: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!isOwner) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-5 transition-colors hover:border-gray-300 dark:hover:border-white/[0.16] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/[0.06] shrink-0">
            <LogOut size={18} className="text-gray-500 dark:text-gray-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Leave trip</p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
              {confirming
                ? 'Are you sure? You’ll lose access to this trip immediately.'
                : 'Remove yourself from this trip. You’ll lose access to all of its data.'}
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {confirming ? (
            <>
              <button
                onClick={() => setConfirming(false)}
                className="text-sm font-medium px-3 h-10 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onLeaveTrip}
                autoFocus
                className="text-sm font-semibold px-4 h-10 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
              >
                Yes, leave
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="text-sm font-semibold px-4 h-10 rounded-xl border border-gray-200 dark:border-white/[0.10] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/30 transition-colors"
            >
              Leave trip
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-5 transition-colors hover:border-gray-300 dark:hover:border-white/[0.16] flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/[0.06] shrink-0">
          <Trash2 size={18} className="text-gray-500 dark:text-gray-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">Delete trip</p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
            {confirming
              ? 'Are you sure? This permanently removes the trip and all of its data.'
              : "Permanently remove this trip and all of its data. This can't be undone."}
          </p>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {confirming ? (
          <>
            <button
              onClick={() => setConfirming(false)}
              className="text-sm font-medium px-3 h-10 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onDeleteTrip}
              autoFocus
              className="text-sm font-semibold px-4 h-10 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
            >
              Yes, delete
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="text-sm font-semibold px-4 h-10 rounded-xl border border-gray-200 dark:border-white/[0.10] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/30 transition-colors"
          >
            Delete trip
          </button>
        )}
      </div>
    </div>
  );
}
