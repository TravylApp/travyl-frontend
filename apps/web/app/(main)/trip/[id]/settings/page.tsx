'use client';

import { use, useState, useEffect, useCallback } from 'react';
import {
  User, FileText, Phone, CreditCard, Settings, Bell, Shield,
  Save, Trash2, Download, Share2, AlertTriangle, ChevronRight,
  Check, X, Plus, Palette, LayoutGrid, Globe, GitFork, Copy,
  Home, Calendar, Plane, Building2, UtensilsCrossed, Compass,
  Luggage, PieChart, Heart, Car, Settings2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ThemePicker } from '@/components/trip/ThemePicker';
import { useTripTheme } from '@/components/trip/TripThemeContext';
import { useItineraryScreen, useAuthStore, isTripOwner, updateTripVisibility } from '@travyl/shared';

// ─── Sub-tab definitions ──────────────────────────────────────

interface SubTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

const SUB_TABS: SubTab[] = [
  { id: 'appearance',       label: 'Theme & Colors',    icon: Palette },
  { id: 'tabs',             label: 'Tabs',              icon: LayoutGrid },
  { id: 'profile',          label: 'Profile',           icon: User },
  { id: 'travel-documents', label: 'Travel Documents',  icon: FileText },
  { id: 'emergency',        label: 'Emergency Contact', icon: Phone },
  { id: 'payment',          label: 'Payment',           icon: CreditCard },
  { id: 'preferences',      label: 'Preferences',       icon: Settings },
  { id: 'notifications',    label: 'Notifications',     icon: Bell },
  { id: 'sharing',          label: 'Sharing',           icon: Share2 },
  { id: 'privacy',          label: 'Privacy',           icon: Shield },
];

// Tab definitions for the Tabs settings section
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

const FALLBACK_BRAND = '#1e3a5f';

// ─── Reusable small components ────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-gray-900 mb-4">{children}</h2>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>;
}

function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition"
      style={{ '--tw-ring-color': FALLBACK_BRAND } as React.CSSProperties}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition"
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

// ─── Section renderers ────────────────────────────────────────

function ProfileSection({
  data,
  onChange,
}: {
  data: typeof INITIAL_PROFILE;
  onChange: (patch: Partial<typeof INITIAL_PROFILE>) => void;
}) {
  return (
    <div>
      <SectionHeading>Profile</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>First Name</FieldLabel>
          <Input value={data.firstName} onChange={(v) => onChange({ firstName: v })} />
        </div>
        <div>
          <FieldLabel>Last Name</FieldLabel>
          <Input value={data.lastName} onChange={(v) => onChange({ lastName: v })} />
        </div>
        <div>
          <FieldLabel>Email</FieldLabel>
          <Input value={data.email} onChange={(v) => onChange({ email: v })} type="email" />
        </div>
        <div>
          <FieldLabel>Phone</FieldLabel>
          <Input value={data.phone} onChange={(v) => onChange({ phone: v })} type="tel" />
        </div>
        <div>
          <FieldLabel>Date of Birth</FieldLabel>
          <Input value={data.dob} onChange={(v) => onChange({ dob: v })} type="date" />
        </div>
        <div>
          <FieldLabel>Nationality</FieldLabel>
          <Input value={data.nationality} onChange={(v) => onChange({ nationality: v })} />
        </div>
      </div>
    </div>
  );
}

function TravelDocumentsSection({
  data,
  onChange,
}: {
  data: typeof INITIAL_DOCUMENTS;
  onChange: (patch: Partial<typeof INITIAL_DOCUMENTS>) => void;
}) {
  return (
    <div>
      <SectionHeading>Travel Documents</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Passport Number</FieldLabel>
          <Input value={data.passportNumber} onChange={(v) => onChange({ passportNumber: v })} />
        </div>
        <div>
          <FieldLabel>Expiry Date</FieldLabel>
          <Input value={data.passportExpiry} onChange={(v) => onChange({ passportExpiry: v })} type="date" />
        </div>
      </div>
    </div>
  );
}

function EmergencyContactSection({
  data,
  onChange,
}: {
  data: typeof INITIAL_EMERGENCY;
  onChange: (patch: Partial<typeof INITIAL_EMERGENCY>) => void;
}) {
  return (
    <div>
      <SectionHeading>Emergency Contact</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Contact Name</FieldLabel>
          <Input value={data.name} onChange={(v) => onChange({ name: v })} />
        </div>
        <div>
          <FieldLabel>Phone Number</FieldLabel>
          <Input value={data.phone} onChange={(v) => onChange({ phone: v })} type="tel" />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Relationship</FieldLabel>
          <Input value={data.relationship} onChange={(v) => onChange({ relationship: v })} />
        </div>
      </div>
    </div>
  );
}

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  isDefault: boolean;
}

function PaymentSection({
  cards,
  onSetDefault,
  onDelete,
  onAdd,
}: {
  cards: SavedCard[];
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <SectionHeading>Payment Methods</SectionHeading>
      <div className="space-y-3 mb-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex items-center justify-between rounded-xl border bg-white p-4"
            style={{ borderColor: card.isDefault ? FALLBACK_BRAND : '#e5e7eb' }}
          >
            <div className="flex items-center gap-3">
              <CreditCard size={20} style={{ color: card.isDefault ? FALLBACK_BRAND : '#9ca3af' }} />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {card.brand} ending in {card.last4}
                </p>
                {card.isDefault && (
                  <span className="text-xs font-medium" style={{ color: FALLBACK_BRAND }}>
                    Default
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!card.isDefault && (
                <button
                  onClick={() => onSetDefault(card.id)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  Set Default
                </button>
              )}
              <button
                onClick={() => onDelete(card.id)}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        style={{ backgroundColor: FALLBACK_BRAND }}
      >
        <Plus size={14} />
        Add New Card
      </button>
    </div>
  );
}

function PreferencesSection({
  data,
  onChange,
}: {
  data: typeof INITIAL_PREFERENCES;
  onChange: (patch: Partial<typeof INITIAL_PREFERENCES>) => void;
}) {
  return (
    <div>
      <SectionHeading>Preferences</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Language</FieldLabel>
          <Select
            value={data.language}
            onChange={(v) => onChange({ language: v })}
            options={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
              { value: 'fr', label: 'French' },
              { value: 'de', label: 'German' },
              { value: 'ja', label: 'Japanese' },
            ]}
          />
        </div>
        <div>
          <FieldLabel>Currency</FieldLabel>
          <Select
            value={data.currency}
            onChange={(v) => onChange({ currency: v })}
            options={[
              { value: 'USD', label: 'USD ($)' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' },
              { value: 'JPY', label: 'JPY' },
              { value: 'CAD', label: 'CAD' },
            ]}
          />
        </div>
        <div>
          <FieldLabel>Time Format</FieldLabel>
          <Select
            value={data.timeFormat}
            onChange={(v) => onChange({ timeFormat: v })}
            options={[
              { value: '12h', label: '12-hour' },
              { value: '24h', label: '24-hour' },
            ]}
          />
        </div>
        <div>
          <FieldLabel>Date Format</FieldLabel>
          <Select
            value={data.dateFormat}
            onChange={(v) => onChange({ dateFormat: v })}
            options={[
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
            ]}
          />
        </div>
        <div>
          <FieldLabel>Distance Unit</FieldLabel>
          <Select
            value={data.distanceUnit}
            onChange={(v) => onChange({ distanceUnit: v })}
            options={[
              { value: 'mi', label: 'Miles' },
              { value: 'km', label: 'Kilometers' },
            ]}
          />
        </div>
        <div>
          <FieldLabel>Temperature Unit</FieldLabel>
          <Select
            value={data.temperatureUnit}
            onChange={(v) => onChange({ temperatureUnit: v })}
            options={[
              { value: 'F', label: 'Fahrenheit' },
              { value: 'C', label: 'Celsius' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function NotificationsSection({
  data,
  onToggle,
}: {
  data: typeof INITIAL_NOTIFICATIONS;
  onToggle: (key: keyof typeof INITIAL_NOTIFICATIONS) => void;
}) {
  const items: { key: keyof typeof INITIAL_NOTIFICATIONS; label: string; description: string }[] = [
    { key: 'flightUpdates',      label: 'Flight Updates',       description: 'Gate changes, delays, and boarding alerts' },
    { key: 'hotelConfirmations', label: 'Hotel Confirmations',  description: 'Booking confirmations and check-in reminders' },
    { key: 'activityReminders',  label: 'Activity Reminders',   description: 'Upcoming tour and event notifications' },
    { key: 'weatherAlerts',      label: 'Weather Alerts',       description: 'Severe weather warnings at your destination' },
    { key: 'travelAdvisories',   label: 'Travel Advisories',    description: 'Government-issued travel safety notices' },
    { key: 'specialOffers',      label: 'Special Offers',       description: 'Deals and discounts from partners' },
  ];

  return (
    <div>
      <SectionHeading>Notifications</SectionHeading>
      <div className="space-y-1">
        {items.map(({ key, label, description }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-xl p-4 hover:bg-gray-50 transition"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
            <Toggle enabled={data[key]} onToggle={() => onToggle(key)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PrivacySection({
  shareTripLink,
  onDownloadData,
  onClearHistory,
  onDeleteAccount,
}: {
  shareTripLink: string;
  onDownloadData: () => void;
  onClearHistory: () => void;
  onDeleteAccount: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(shareTripLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <SectionHeading>Privacy</SectionHeading>
      <div className="space-y-6">
        {/* Download Data */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Download My Data</p>
            <p className="text-xs text-gray-500 mt-0.5">Export a copy of all your trip data</p>
          </div>
          <button
            onClick={onDownloadData}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            <Download size={14} />
            Download
          </button>
        </div>

        {/* Share Trip Link */}
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Share2 size={14} className="text-gray-500" />
            <p className="text-sm font-semibold text-gray-900">Share Trip Link</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600 font-mono truncate">
              {shareTripLink}
            </div>
            <button
              onClick={copyLink}
              className="shrink-0 text-xs font-medium px-3 py-2 rounded-lg text-white transition"
              style={{ backgroundColor: copied ? '#10b981' : FALLBACK_BRAND }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Clear Search History */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Clear Search History</p>
            <p className="text-xs text-gray-500 mt-0.5">Remove all recent searches</p>
          </div>
          <button
            onClick={onClearHistory}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-600" />
            <p className="text-sm font-bold text-red-700">Danger Zone</p>
          </div>
          <p className="text-xs text-red-600 mb-3">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={onDeleteAccount}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
          >
            <Trash2 size={14} />
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Trip Sharing Section ────────────────────────────────────────

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
        {/* Make Public Toggle */}
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

        {/* Share Link Toggle */}
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

        {/* Share URL Display */}
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

        {/* Fork Count */}
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

// ─── Initial mock data ────────────────────────────────────────

const INITIAL_PROFILE = {
  firstName: 'Alex',
  lastName: 'Rivera',
  email: 'alex.rivera@email.com',
  phone: '+1 (555) 123-4567',
  dob: '1992-06-15',
  nationality: 'United States',
};

const INITIAL_DOCUMENTS = {
  passportNumber: 'X12345678',
  passportExpiry: '2029-03-20',
};

const INITIAL_EMERGENCY = {
  name: 'Jordan Rivera',
  phone: '+1 (555) 987-6543',
  relationship: 'Sibling',
};

const INITIAL_CARDS: SavedCard[] = [
  { id: '1', brand: 'Visa',       last4: '4242', isDefault: true },
  { id: '2', brand: 'Mastercard', last4: '8888', isDefault: false },
  { id: '3', brand: 'Amex',       last4: '1234', isDefault: false },
];

const INITIAL_PREFERENCES = {
  language: 'en',
  currency: 'USD',
  timeFormat: '12h',
  dateFormat: 'MM/DD/YYYY',
  distanceUnit: 'mi',
  temperatureUnit: 'F',
};

const INITIAL_NOTIFICATIONS = {
  flightUpdates: true,
  hotelConfirmations: true,
  activityReminders: true,
  weatherAlerts: false,
  travelAdvisories: true,
  specialOffers: false,
};

// ─── Main page component ──────────────────────────────────────

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trip, isLoading: tripLoading, refetch } = useItineraryScreen(id);
  const user = useAuthStore((s) => s.user);
  const isOwner = trip ? isTripOwner(trip, user?.id ?? null) : false;

  const [activeTab, setActiveTab] = useState('appearance');
  const [dirty, setDirty] = useState(false);

  // ── Appearance — driven by shared TripThemeContext ───
  const {
    theme, themeId, customColor,
    setTripTheme,
    tabColorOverrides, setTabColor, resetTabColors,
    itineraryColorOverrides, setItineraryColor, resetItineraryColors,
    hiddenTabs, setTabHidden,
  } = useTripTheme();

  // Trip sharing state
  const [isPublic, setIsPublic] = useState(false);
  const [isShared, setIsShared] = useState(false);

  // Sync trip sharing state with loaded trip
  useEffect(() => {
    if (trip) {
      setIsPublic(trip.is_public ?? false);
      setIsShared(trip.is_shared ?? false);
    }
  }, [trip]);

  // Handle toggling public status
  const handleTogglePublic = async () => {
    if (!trip || !isOwner) return;
    try {
      await updateTripVisibility(trip.id, !isPublic);
      setIsPublic(!isPublic);
      refetch();
    } catch (error) {
      console.error('Failed to update trip visibility:', error);
      alert('Failed to update trip visibility');
    }
  };

  // Handle toggling shared status (mock for now - would need backend support)
  const handleToggleShared = () => {
    setIsShared(!isShared);
    // In a real implementation, this would call an API to generate/update the share token
  };

  // ── State for each section ───
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [emergency, setEmergency] = useState(INITIAL_EMERGENCY);
  const [cards, setCards] = useState<SavedCard[]>(INITIAL_CARDS);
  const [preferences, setPreferences] = useState(INITIAL_PREFERENCES);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  // Track if anything changed
  const markDirty = useCallback(() => setDirty(true), []);

  const handleSave = () => {
    // In a real app this would call the API
    setDirty(false);
  };

  const handleDiscard = () => {
    setProfile(INITIAL_PROFILE);
    setDocuments(INITIAL_DOCUMENTS);
    setEmergency(INITIAL_EMERGENCY);
    setCards(INITIAL_CARDS);
    setPreferences(INITIAL_PREFERENCES);
    setNotifications(INITIAL_NOTIFICATIONS);
    setDirty(false);
  };

  // ── Section-specific helpers ──
  const updateProfile = (patch: Partial<typeof INITIAL_PROFILE>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
    markDirty();
  };

  const updateDocuments = (patch: Partial<typeof INITIAL_DOCUMENTS>) => {
    setDocuments((prev) => ({ ...prev, ...patch }));
    markDirty();
  };

  const updateEmergency = (patch: Partial<typeof INITIAL_EMERGENCY>) => {
    setEmergency((prev) => ({ ...prev, ...patch }));
    markDirty();
  };

  const setDefaultCard = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => ({ ...c, isDefault: c.id === cardId })),
    );
    markDirty();
  };

  const deleteCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    markDirty();
  };

  const addCard = () => {
    // Placeholder — in production this opens a payment form
    const newId = String(Date.now());
    setCards((prev) => [
      ...prev,
      { id: newId, brand: 'Visa', last4: String(Math.floor(1000 + Math.random() * 9000)), isDefault: false },
    ]);
    markDirty();
  };

  const updatePreferences = (patch: Partial<typeof INITIAL_PREFERENCES>) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
    markDirty();
  };

  const toggleNotification = (key: keyof typeof INITIAL_NOTIFICATIONS) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    markDirty();
  };

  // ── Content router ──
  const renderContent = () => {
    switch (activeTab) {
      case 'appearance':
        return (
          <div>
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
          </div>
        );
      case 'tabs':
        return (
          <div>
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
                      <Toggle enabled={isEnabled} onToggle={() => setTabHidden(segment, isEnabled)} color={theme.base} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'profile':
        return <ProfileSection data={profile} onChange={updateProfile} />;
      case 'travel-documents':
        return <TravelDocumentsSection data={documents} onChange={updateDocuments} />;
      case 'emergency':
        return <EmergencyContactSection data={emergency} onChange={updateEmergency} />;
      case 'payment':
        return (
          <PaymentSection
            cards={cards}
            onSetDefault={setDefaultCard}
            onDelete={deleteCard}
            onAdd={addCard}
          />
        );
      case 'preferences':
        return <PreferencesSection data={preferences} onChange={updatePreferences} />;
      case 'notifications':
        return <NotificationsSection data={notifications} onToggle={toggleNotification} />;
      case 'sharing':
        // Only show sharing section to trip owner
        if (!isOwner) {
          return (
            <div className="text-center py-8">
              <Shield size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Only the trip owner can manage sharing settings.</p>
            </div>
          );
        }
        return (
          <TripSharingSection
            tripId={id}
            isPublic={isPublic}
            isShared={isShared}
            shareToken={trip?.share_link_token ?? null}
            forkCount={trip?.fork_count ?? 0}
            onTogglePublic={handleTogglePublic}
            onToggleShared={handleToggleShared}
          />
        );
      case 'privacy':
        return (
          <PrivacySection
            shareTripLink={`https://travyl.app/trip/${id}/share`}
            onDownloadData={() => alert('Downloading your data...')}
            onClearHistory={() => alert('Search history cleared.')}
            onDeleteAccount={() => alert('Account deletion requested.')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[480px]">
      {/* ── Left sidebar: sub-tab list ── */}
      <nav className="shrink-0 md:w-56">
        <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          {SUB_TABS.map(({ id: tabId, label, icon: Icon }) => {
            const isActive = activeTab === tabId;
            return (
              <li key={tabId}>
                <button
                  onClick={() => setActiveTab(tabId)}
                  className={`flex items-center gap-2.5 w-full whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  style={isActive ? { backgroundColor: theme.base, color: theme.textOnBase } : undefined}
                >
                  <Icon size={16} style={isActive ? { color: theme.textOnBase } : undefined} className={isActive ? '' : 'text-gray-400'} />
                  <span className="flex-1 text-left">{label}</span>
                  <ChevronRight
                    size={14}
                    style={isActive ? { color: theme.textOnBase, opacity: 0.7 } : undefined}
                    className={`hidden md:block ${isActive ? '' : 'text-gray-300'}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Right content area ── */}
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          {renderContent()}
        </div>
      </div>

      {/* ── Floating save bar ── */}
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
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white transition hover:opacity-90"
            style={{ backgroundColor: theme.base, color: theme.textOnBase }}
          >
            <Save size={14} />
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
