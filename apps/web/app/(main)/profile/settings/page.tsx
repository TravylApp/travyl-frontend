"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { User, Compass, Bell, Settings, CheckCircle, Plane, Hotel, Loader2, AlertCircle, Plus, Eye, Check, Shield, Smartphone, LogOut, Star, HelpCircle, MessageSquare, Trash2, X, ChevronDown, Pencil, ClipboardList, Activity, Zap, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { AvatarUpload } from '@/components/AvatarUpload';
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { LoadingBar } from '@/components/LoadingBar';
import { useAuthStore, supabase } from '@travyl/shared';
import { fetchProfile } from '@travyl/shared';
import type { Profile } from '@travyl/shared';

// ─── Types ─────────────────────────────────────────────
import { useSettingsStore } from '@travyl/shared';
type TabId = 'profile' | 'travel-style' | 'notifications' | 'account';

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  personalizedPicks: boolean;
  travelNewsletter: boolean;
  newFeatures: boolean;
  socialActivity: boolean;
  tripReminders: boolean;
  priceDropAlerts: boolean;
  eventAlerts: boolean;
}

interface ProfileData {
  profilePhoto: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  dietaryRequirements: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  currency: string;
  language: string;
  timezone: string;
  distanceUnit: string;
  temperatureUnit: string;
}

// ─── Constants ─────────────────────────────────────────
const TABS: { id: TabId; icon: any; label: string }[] = [
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'travel-style', icon: Compass, label: 'Travel Style' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'account', icon: Settings, label: 'Account' },
];


// ─── Reusable sub-components ───────────────────────────

function SectionCard({ children, className = '', title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-sm font-bold tracking-[1.5px] text-gray-400 uppercase">{title}</span>
        </div>
      )}
      <div className="p-6 flex-1">{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-bold tracking-[1.2px] text-gray-400 uppercase mb-4">{children}</p>;
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-500 mb-2 uppercase tracking-tight">{children}</label>;
}

function SettingsInput({ id, label, value, onChange, placeholder, type = 'text', disabled, suffix }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean; suffix?: React.ReactNode;
}) {
  return (
    <div className="w-full">
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <div className="relative">
        <input
          id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} disabled={disabled}
          className="w-full h-12 px-4 text-lg text-gray-900 bg-white border border-gray-200 rounded-xl hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400/20 disabled:opacity-50 transition-all"
        />
        {suffix && <div className="absolute right-4 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button" onClick={onChange} disabled={disabled}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 focus-visible:outline-none ${checked ? 'bg-blue-500' : 'bg-gray-200'} ${disabled ? 'opacity-50' : ''}`}
      role="switch" aria-checked={checked}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
    </button>
  );
}

function Chip({ label, selected, onClick, color }: { label: string; selected: boolean; onClick: () => void; color?: string }) {
  const initials = label.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <button
      type="button" onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-all ${
        selected ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
      }`}
    >
      {color && (
        <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
          {initials}
        </span>
      )}
      <span className="truncate max-w-[120px]">{label}</span>
      {selected && <Check size={14} className="text-blue-500 shrink-0" />}
    </button>
  );
}

function PillToggle({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
        selected ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

function SubTabs<T extends string>({ tabs, active, onChange }: {
  tabs: { id: T; label: string; icon?: React.ReactNode; description?: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-4 mb-6 border-b border-gray-100">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-2 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
            active === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function CounterInline({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-base text-gray-600 font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-900 text-lg font-bold transition-all">-</button>
        <span className="w-6 text-center text-base font-bold text-gray-900">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-900 text-lg font-bold transition-all">+</button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────
export default function ProfileSettings() {
  // Auth state
  const { user, session, loading: authLoading } = useAuthStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<Profile | null>(null);

  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingTabChange, setPendingTabChange] = useState<TabId | null>(null);

  const inlineSaveRef = useRef<HTMLDivElement>(null);
  const [inlineSaveVisible, setInlineSaveVisible] = useState(true);
  const [showStickySuccess, setShowStickySuccess] = useState(false);
  const stickySuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Profile Data ──────────────────────────────────
  const [formData, setFormData] = useState<ProfileData>({} as ProfileData);
  const [originalFormData, setOriginalFormData] = useState<ProfileData>({} as ProfileData);

  // ─── Travel Style ──────────────────────────────────
  const [homeAirport, setHomeAirport] = useState<string>('');
  const [typicalDuration, setTypicalDuration] = useState<number>(0);
  const [budget, setBudget] = useState<string>('');
  const [travelPace, setTravelPace] = useState<string>('');
  const [travelers, setTravelers] = useState({ adults: 0, children: 0, infants: 0, pets: 0 });
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [selectedHotels, setSelectedHotels] = useState<string[]>([]);
  const [selectedStayTypes, setSelectedStayTypes] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  const [originalTravelStyle, setOriginalTravelStyle] = useState({
    homeAirport: '', typicalDuration: 0, budget: '', travelPace: '',
    travelers: { adults: 0, children: 0, infants: 0, pets: 0 },
    selectedAirlines: [], selectedHotels: [],
    selectedStayTypes: [], selectedInterests: [],
    selectedRegions: [],
  });

  // ─── Notifications ─────────────────────────────────
  const [notifications, setNotifications] = useState<NotificationPreferences>({} as NotificationPreferences);
  const [originalNotifications, setOriginalNotifications] = useState<NotificationPreferences>({} as NotificationPreferences);

  // ─── Account ───────────────────────────────────────
  const [profileVisibility, setProfileVisibility] = useState<string>('');
  const [privacyControls, setPrivacyControls] = useState({ showEmail: false, showActivity: false, sharePartners: false, analytics: false });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLinkedAccountsDropdown, setShowLinkedAccountsDropdown] = useState(false);

  // Sub-tab states for pill navigation
  const [personalSafetyTab, setPersonalSafetyTab] = useState<'emergency' | 'dietary'>('emergency');
  const [accountSecurityTab, setAccountSecurityTab] = useState<'password' | 'sessions'>('password');

  const [originalAccount, setOriginalAccount] = useState({
    profileVisibility: '',
    privacyControls: { showEmail: false, showActivity: false, sharePartners: false, analytics: false },
    twoFactorEnabled: false,
  });

  // ─── Change Detection ──────────────────────────────
  const isModified = useCallback(() => {
    const formChanged = JSON.stringify(formData) !== JSON.stringify(originalFormData);
    const travelChanged = JSON.stringify({ homeAirport, typicalDuration, budget, travelPace, travelers, selectedAirlines, selectedHotels, selectedStayTypes, selectedInterests, selectedRegions }) !== JSON.stringify(originalTravelStyle);
    const notifChanged = JSON.stringify(notifications) !== JSON.stringify(originalNotifications);
    const accountChanged = JSON.stringify({ profileVisibility, privacyControls, twoFactorEnabled }) !== JSON.stringify(originalAccount);
    return formChanged || travelChanged || notifChanged || accountChanged;
  }, [formData, originalFormData, homeAirport, typicalDuration, budget, travelPace, travelers, selectedAirlines, selectedHotels, selectedStayTypes, selectedInterests, selectedRegions, originalTravelStyle, notifications, originalNotifications, profileVisibility, privacyControls, twoFactorEnabled, originalAccount]);

  const hasChanges = isModified();

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (hasChanges) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  useEffect(() => {
    const el = inlineSaveRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInlineSaveVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab, isLoading, isTabLoading]);

  useEffect(() => {
    return () => { if (stickySuccessTimer.current) clearTimeout(stickySuccessTimer.current); };
  }, []);

  // ─── Load Profile Data ───────────────────────────────
  useEffect(() => {
    async function loadProfile() {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Check if user is authenticated
        if (!user || !session) {
          setError('You must be signed in to view settings');
          setIsLoading(false);
          return;
        }

        // Check if Supabase is configured
        if (!supabase) {
          setError('Supabase is not configured. Please check your .env.local file');
          setIsLoading(false);
          return;
        }

        // Fetch profile data
        const profile = await fetchProfile(user.id);
        setProfileData(profile);

        // Populate form data from profile and user
        setFormData({
          profilePhoto: profile.avatar_url,
          firstName: profile.display_name || user.user_metadata?.display_name || user.user_metadata?.name || '',
          lastName: user.user_metadata?.lastName || '',
          email: user.email || '',
          phone: user.phone || '',
          city: profile.city || user.user_metadata?.city || '',
          country: profile.country || user.user_metadata?.country || '',
          emergencyName: user.user_metadata?.emergencyName || '',
          emergencyPhone: user.user_metadata?.emergencyPhone || '',
          emergencyRelation: user.user_metadata?.emergencyRelation || '',
          dietaryRequirements: user.user_metadata?.dietaryRequirements || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          currency: user.user_metadata?.currency || 'USD',
          language: user.user_metadata?.language || 'English',
          timezone: user.user_metadata?.timezone || 'PST (UTC-8)',
          distanceUnit: user.user_metadata?.distanceUnit || 'Miles',
          temperatureUnit: user.user_metadata?.temperatureUnit || '°F',
        });

        setOriginalFormData({
          profilePhoto: profile.avatar_url,
          firstName: profile.display_name || user.user_metadata?.display_name || user.user_metadata?.name || '',
          lastName: user.user_metadata?.lastName || '',
          email: user.email || '',
          phone: user.phone || '',
          city: profile.city || user.user_metadata?.city || '',
          country: profile.country || user.user_metadata?.country || '',
          emergencyName: user.user_metadata?.emergencyName || '',
          emergencyPhone: user.user_metadata?.emergencyPhone || '',
          emergencyRelation: user.user_metadata?.emergencyRelation || '',
          dietaryRequirements: user.user_metadata?.dietaryRequirements || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          currency: user.user_metadata?.currency || 'USD',
          language: user.user_metadata?.language || 'English',
          timezone: user.user_metadata?.timezone || 'PST (UTC-8)',
          distanceUnit: user.user_metadata?.distanceUnit || 'Miles',
          temperatureUnit: user.user_metadata?.temperatureUnit || '°F',
        });

      } catch (err) {
        console.error('Error loading profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [user, session, authLoading]);

  // ─── Save ──────────────────────────────────────────
  const snapshotAllRef = useRef(() => {});
  snapshotAllRef.current = () => {
    setOriginalFormData({ ...formData });
    setOriginalTravelStyle({ homeAirport, typicalDuration, budget, travelPace, travelers: { ...travelers }, selectedAirlines: [...selectedAirlines], selectedHotels: [...selectedHotels], selectedStayTypes: [...selectedStayTypes], selectedInterests: [...selectedInterests], selectedRegions: [...selectedRegions] });
    setOriginalNotifications({ ...notifications });
    setOriginalAccount({ profileVisibility, privacyControls: { ...privacyControls }, twoFactorEnabled });
  };
  const snapshotAll = () => snapshotAllRef.current();

  const handleSave = async (): Promise<boolean> => {
    if (!hasChanges) { toast.info('No changes to save'); return true; }
    setIsSaving(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      if (!inlineSaveVisible) {
        setShowStickySuccess(true);
        if (stickySuccessTimer.current) clearTimeout(stickySuccessTimer.current);
        stickySuccessTimer.current = setTimeout(() => setShowStickySuccess(false), 1800);
      } else {
        toast.success('Settings saved successfully!');
      }
      snapshotAll();
      return true;
    } catch {
      toast.error('Failed to save. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Discard ───────────────────────────────────────
  const handleDiscardChanges = () => {
    setFormData({ ...originalFormData });
    setHomeAirport(originalTravelStyle.homeAirport);
    setTypicalDuration(originalTravelStyle.typicalDuration);
    setBudget(originalTravelStyle.budget);
    setTravelPace(originalTravelStyle.travelPace);
    setTravelers({ ...originalTravelStyle.travelers });
    setSelectedAirlines([...originalTravelStyle.selectedAirlines]);
    setSelectedHotels([...originalTravelStyle.selectedHotels]);
    setSelectedStayTypes([...originalTravelStyle.selectedStayTypes]);
    setSelectedInterests([...originalTravelStyle.selectedInterests]);
    setSelectedRegions([...originalTravelStyle.selectedRegions]);
    setNotifications({ ...originalNotifications });
    setProfileVisibility(originalAccount.profileVisibility);
    setPrivacyControls({ ...originalAccount.privacyControls });
    setTwoFactorEnabled(originalAccount.twoFactorEnabled);
  };

  // ─── Tab changes ───────────────────────────────────
  const tabLabels: Record<string, string> = { profile: 'Profile', 'travel-style': 'Travel Style', notifications: 'Notifications', account: 'Account' };

  const performTabChange = async (tab: string) => {
    setIsTabLoading(true);
    setActiveTab(tab as TabId);
    await new Promise(r => setTimeout(r, 200));
    setIsTabLoading(false);
  };

  const handleTabChange = async (tab: TabId) => {
    if (tab === activeTab) return;
    if (hasChanges) { setPendingTabChange(tab); setShowUnsavedDialog(true); return; }
    await performTabChange(tab);
  };

  const handleDialogSaveAndContinue = async () => {
    const saved = await handleSave();
    if (saved && pendingTabChange) { setShowUnsavedDialog(false); await performTabChange(pendingTabChange); setPendingTabChange(null); }
  };
  const handleDialogDiscard = async () => {
    handleDiscardChanges(); setShowUnsavedDialog(false);
    if (pendingTabChange) { await performTabChange(pendingTabChange); setPendingTabChange(null); }
  };
  const handleDialogCancel = () => { setShowUnsavedDialog(false); setPendingTabChange(null); };

  // ─── Render ───────────────────────────────────────────
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e0f2fe] flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 size={48} className="text-[#1e3a5f] animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-2">Loading Settings</h2>
          <p className="text-gray-500">Please wait while we load your profile...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e0f2fe] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-white rounded-3xl shadow-2xl p-10">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-3">Authentication Required</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2a4a6f] transition-all font-bold shadow-lg"
          >
            Sign In to Continue
          </a>
        </div>
      </div>
    );
  }

  if (error && supabase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e0f2fe] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-white rounded-3xl shadow-2xl p-10">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-3">Unable to Load Profile</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2a4a6f] transition-all font-bold shadow-lg"
          >
            <Loader2 size={18} className="animate-spin" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── Helpers ───────────────────────────────────────
  const updateForm = (field: keyof ProfileData, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArray = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const xpCurrent = 620;
  const xpMax = 1000;

  const travelerSummary = () => {
    const parts: string[] = [];
    if (travelers.adults) parts.push(`${travelers.adults} adult${travelers.adults > 1 ? 's' : ''}`);
    if (travelers.children) parts.push(`${travelers.children} child${travelers.children > 1 ? 'ren' : ''}`);
    if (travelers.infants) parts.push(`${travelers.infants} infant${travelers.infants > 1 ? 's' : ''}`);
    if (travelers.pets) parts.push(`${travelers.pets} pet${travelers.pets > 1 ? 's' : ''}`);
    return parts.join(', ') || '1 adult';
  };

  const enabledNotifCount = Object.values(notifications).filter(Boolean).length;

  const Skeleton = () => (
    <div className="animate-pulse space-y-6 p-8">
      <div className="h-6 bg-gray-100 rounded w-1/4" />
      <div className="h-12 bg-gray-100 rounded" />
      <div className="grid grid-cols-2 gap-6">
        <div className="h-12 bg-gray-100 rounded" />
        <div className="h-12 bg-gray-100 rounded" />
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <LoadingBar isLoading={isLoading || isTabLoading || isSaving} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-12">
        {/* Back Button */}
        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Profile</span>
        </button>

        {/* Header — Matches Main Layout */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-4xl text-gray-950 tracking-tight font-bold">Settings</h1>
            <p className="text-lg text-gray-500 mt-2">Manage your profile, preferences and security</p>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center border-2 border-white shadow-sm">
              {formData.profilePhoto ? (
                <img src={formData.profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={24} className="text-gray-400" />
              )}
            </div>
            <div className="hidden sm:block">
              <p className="text-xl text-gray-950 font-bold leading-none mb-1.5">
                {formData.firstName || 'Loading...'} {formData.lastName || ''}
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-black uppercase rounded tracking-wider">Level 3</span>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Verified Explorer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs — Matches Main Layout Style */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide border-b border-gray-100">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              disabled={isTabLoading}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-lg whitespace-nowrap transition-all touch-manipulation font-semibold ${
                activeTab === tab.id
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              } ${isTabLoading ? 'opacity-50' : ''}`}
            >
              <tab.icon size={20} />
              {tab.label}
              {hasChanges && activeTab === tab.id && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area — Condensing Philosophy Applied */}
        {isLoading || isTabLoading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"><Skeleton /></div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">

            {/* ═══════ PROFILE ═══════ */}
            {activeTab === 'profile' && (
              <div className="p-6 sm:p-10 space-y-8">
                <div className="flex flex-col lg:flex-row gap-10">
                  {/* Left: Bio/Avatar Info */}
                  <div className="lg:w-[320px] flex flex-col items-center text-center p-8 rounded-[32px] bg-gray-50/50 border border-gray-100 shadow-inner shrink-0">
                    <AvatarUpload currentImage={formData.profilePhoto || undefined} onImageChange={url => updateForm('profilePhoto', url)} size="lg" hideButtons />
                    <div className="mt-6 w-full">
                       {isEditingName ? (
                         <div className="flex flex-col gap-3">
                            <SettingsInput id="f" label="FIRST NAME" value={formData.firstName} onChange={v => updateForm('firstName', v)} />
                            <SettingsInput id="l" label="LAST NAME" value={formData.lastName} onChange={v => updateForm('lastName', v)} />
                            <button onClick={() => setIsEditingName(false)} className="h-10 bg-blue-600 text-white rounded-xl text-sm font-bold w-full mt-2 shadow-md hover:bg-blue-700 transition-colors">Save Name</button>
                         </div>
                       ) : (
                         <div className="group cursor-pointer flex items-center justify-center gap-2" onClick={() => setIsEditingName(true)}>
                            <h2 className="text-2xl font-black text-gray-900 group-hover:text-blue-600 transition-colors tracking-tight">{formData.firstName} {formData.lastName}</h2>
                            <Pencil size={16} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-all" />
                         </div>
                       )}
                       <div className="mt-6 space-y-2">
                          <div className="flex items-center justify-between px-1">
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress</span>
                             <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{xpCurrent}/{xpMax} XP</span>
                          </div>
                          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                             <div className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(xpCurrent/xpMax)*100}%` }} />
                          </div>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mt-10 pt-8 border-t border-gray-200 w-full">
                       <div className="text-left"><p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] leading-none mb-2">Trips</p><p className="text-2xl font-black text-gray-900 leading-none">24</p></div>
                       <div className="text-left"><p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] leading-none mb-2">Cities</p><p className="text-2xl font-black text-gray-900 leading-none">112</p></div>
                    </div>
                  </div>

                  {/* Right: Personal & Contact Grid */}
                  <div className="flex-1 space-y-8">
                    <SectionCard title="Contact & Location">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                          <SettingsInput id="em" label="EMAIL ADDRESS" value={formData.email} onChange={v => updateForm('email', v)} type="email" />
                          <SettingsInput id="ph" label="PHONE NUMBER" value={formData.phone} onChange={v => updateForm('phone', v)} type="tel" />
                          <SettingsInput id="ct" label="HOME CITY" value={formData.city} onChange={v => updateForm('city', v)} />
                          <SettingsInput id="cn" label="COUNTRY" value={formData.country} onChange={v => updateForm('country', v)} />
                       </div>
                    </SectionCard>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                       <SectionCard title="Health & Safety">
                          <SubTabs tabs={[{ id: 'emergency', label: 'Emergency Contact' }, { id: 'dietary', label: 'Dietary Prefs' }]} active={personalSafetyTab} onChange={setPersonalSafetyTab} />
                          {personalSafetyTab === 'emergency' ? (
                            <div className="space-y-6 mt-2">
                               <SettingsInput id="en" label="CONTACT NAME" value={formData.emergencyName} onChange={v => updateForm('emergencyName', v)} />
                               <div className="grid grid-cols-2 gap-6">
                                  <SettingsInput id="ep" label="PHONE" value={formData.emergencyPhone} onChange={v => updateForm('emergencyPhone', v)} />
                                  <SettingsInput id="er" label="RELATION" value={formData.emergencyRelation} onChange={v => updateForm('emergencyRelation', v)} />
                               </div>
                            </div>
                          ) : (
                            <div className="space-y-4 mt-2">
                               <p className="text-sm text-gray-400 font-medium leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">These preferences are shared with restaurants and airlines during bookings to ensure your safety and comfort.</p>
                               <SettingsInput id="dr" label="REQUIREMENTS" value={formData.dietaryRequirements} onChange={v => updateForm('dietaryRequirements', v)} placeholder="None specified" />
                            </div>
                          )}
                       </SectionCard>
                       <SectionCard title="Regional Settings">
                          <div className="space-y-6">
                             <div className="grid grid-cols-2 gap-6">
                                <SettingsInput id="cur" label="CURRENCY" value={formData.currency} onChange={v => updateForm('currency', v)} />
                                <SettingsInput id="lng" label="LANGUAGE" value={formData.language} onChange={v => updateForm('language', v)} />
                             </div>
                             <SettingsInput id="tz" label="TIMEZONE" value={formData.timezone} onChange={v => updateForm('timezone', v)} />
                             <div className="grid grid-cols-2 gap-6">
                                <SettingsInput id="dst" label="DISTANCE UNIT" value={formData.distanceUnit} onChange={v => updateForm('distanceUnit', v)} />
                                <SettingsInput id="tmp" label="TEMP UNIT" value={formData.temperatureUnit} onChange={v => updateForm('temperatureUnit', v)} />
                             </div>
                          </div>
                       </SectionCard>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════ TRAVEL STYLE ═══════ */}
            {activeTab === 'travel-style' && (
              <div className="p-6 sm:p-10 space-y-8">
                 <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Left: Basics & Group */}
                    <div className="xl:col-span-4 space-y-8">
                       <SectionCard title="Default Parameters">
                          <div className="space-y-6">
                             <SettingsInput id="ha" label="HOME AIRPORT" value={homeAirport} onChange={setHomeAirport} />
                             <div>
                                <FieldLabel>TYPICAL DURATION</FieldLabel>
                                <div className="flex items-center h-12 bg-white border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-400/20 transition-all">
                                   <button onClick={() => setTypicalDuration(Math.max(1, typicalDuration-1))} className="w-12 h-full bg-gray-50 text-gray-400 hover:text-gray-900 font-black text-xl transition-colors border-r border-gray-100">-</button>
                                   <span className="flex-1 text-center text-sm font-bold text-gray-900 tracking-tight">{typicalDuration} Days</span>
                                   <button onClick={() => setTypicalDuration(typicalDuration+1)} className="w-12 h-full bg-gray-50 text-gray-400 hover:text-gray-900 font-black text-xl transition-colors border-l border-gray-100">+</button>
                                </div>
                             </div>
                             <SettingsInput id="bdg" label="AVG BUDGET" value={budget} onChange={setBudget} />
                             <div>
                                <FieldLabel>TRAVEL PACE</FieldLabel>
                                <div className="relative">
                                  <select value={travelPace} onChange={e => setTravelPace(e.target.value)} className="w-full h-12 px-4 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/20 transition-all font-bold appearance-none cursor-pointer">
                                     {['Relaxed', 'Balanced', 'Fast-Paced'].map(p => <option key={p} value={p}>{p}</option>)}
                                  </select>
                                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                             </div>
                          </div>
                       </SectionCard>
                       <SectionCard title="Default Group">
                          <div className="space-y-3">
                             <CounterInline label="Adults" value={travelers.adults} onChange={v => setTravelers(p => ({ ...p, adults: v }))} min={1} />
                             <CounterInline label="Children" value={travelers.children} onChange={v => setTravelers(p => ({ ...p, children: v }))} />
                             <CounterInline label="Infants" value={travelers.infants} onChange={v => setTravelers(p => ({ ...p, infants: v }))} />
                             <CounterInline label="Pets" value={travelers.pets} onChange={v => setTravelers(p => ({ ...p, pets: v }))} />
                          </div>
                       </SectionCard>
                    </div>

                    {/* Right: Preferences */}
                    <div className="xl:col-span-8 space-y-8">
                       <SectionCard title="Interests & Environment">
                          <div className="space-y-8">
                             {/* Mock data removed - EXPLORATION INTERESTS, STAY TYPES, REGIONS will be populated from API */}
                             <div><SectionLabel>EXPLORATION INTERESTS</SectionLabel><div className="text-sm text-gray-400 italic">Data will be loaded from API</div></div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div><SectionLabel>STAY TYPES</SectionLabel><div className="text-sm text-gray-400 italic">Data will be loaded from API</div></div>
                                <div><SectionLabel>REGIONS</SectionLabel><div className="text-sm text-gray-400 italic">Data will be loaded from API</div></div>
                             </div>
                          </div>
                       </SectionCard>

                       {/* Mock data removed - BRAND LOYALTY section will be populated from API */}
                       <SectionCard title="Brand Loyalty">
                          <div className="space-y-8">
                             <div>
                                <SectionLabel>FAVORITE AIRLINES</SectionLabel>
                                <div className="text-sm text-gray-400 italic">Data will be loaded from API</div>
                             </div>
                             <div>
                                <SectionLabel>PREFERRED HOTELS</SectionLabel>
                                <div className="text-sm text-gray-400 italic">Data will be loaded from API</div>
                             </div>
                          </div>
                       </SectionCard>
                    </div>
                 </div>
              </div>
            )}

            {/* ═══════ NOTIFICATIONS ═══════ */}
            {activeTab === 'notifications' && (
              <div className="p-6 sm:p-10 space-y-8">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <SectionCard title="Active Channels">
                       <div className="space-y-2">
                          {[
                            { key: 'email' as const, title: 'Email Updates', desc: 'Summary reports and trip confirmations' },
                            { key: 'push' as const, title: 'Push Alerts', desc: 'Real-time flight and booking notifications' },
                            { key: 'sms' as const, title: 'SMS Messaging', desc: 'Critical flight updates and travel alerts' },
                          ].map(item => (
                            <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                               <div className="pr-6"><p className="text-base font-bold text-gray-900 leading-tight">{item.title}</p><p className="text-sm text-gray-400 mt-1">{item.desc}</p></div>
                               <Toggle checked={notifications[item.key]} onChange={() => setNotifications(p => ({ ...p, [item.key]: !p[item.key] }))} />
                            </div>
                          ))}
                       </div>
                    </SectionCard>
                    <SectionCard title="Itinerary Management">
                       <div className="space-y-2">
                          {[
                            { key: 'tripReminders' as const, title: 'Trip Reminders', desc: 'Check-in and departure time windows' },
                            { key: 'priceDropAlerts' as const, title: 'Price Watches', desc: 'Notifications for saved destination fare changes' },
                            { key: 'eventAlerts' as const, title: 'Local Events', desc: 'Festivals and happenings in your current location' },
                          ].map(item => (
                            <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                               <div className="pr-6"><p className="text-base font-bold text-gray-900 leading-tight">{item.title}</p><p className="text-sm text-gray-400 mt-1">{item.desc}</p></div>
                               <Toggle checked={notifications[item.key]} onChange={() => setNotifications(p => ({ ...p, [item.key]: !p[item.key] }))} />
                            </div>
                          ))}
                       </div>
                    </SectionCard>
                 </div>
              </div>
            )}

            {/* ═══════ ACCOUNT ═══════ */}
            {activeTab === 'account' && (
              <div className="p-6 sm:p-10 space-y-8">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Security Column */}
                    <div className="space-y-8">
                       <SectionCard title="Security Credentials">
                          <div className="space-y-6">
                             <SettingsInput id="cpw" label="CURRENT PASSWORD" value={formData.currentPassword} onChange={v => updateForm('currentPassword', v)} type={showCurrentPassword ? 'text' : 'password'} suffix={<button onClick={() => setShowCurrentPassword(!showCurrentPassword)}><Eye size={18} className="text-gray-300 hover:text-gray-500 transition-colors" /></button>} />
                             <SettingsInput id="npw" label="NEW PASSWORD" value={formData.newPassword} onChange={v => updateForm('newPassword', v)} type={showNewPassword ? 'text' : 'password'} placeholder="min. 8 characters" suffix={<button onClick={() => setShowNewPassword(!showNewPassword)}><Eye size={18} className="text-gray-300 hover:text-gray-500 transition-colors" /></button>} />
                             {formData.newPassword && <PasswordStrengthMeter password={formData.newPassword} />}

                             <div className="pt-8 mt-8 border-t border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3"><Shield size={20} className="text-blue-500" /><span className="text-base font-bold text-gray-900 uppercase tracking-tight">2FA Protection</span></div>
                                <Toggle checked={twoFactorEnabled} onChange={() => setTwoFactorEnabled(!twoFactorEnabled)} />
                             </div>

                             {/* Linked Accounts & Devices Dropdown - Dependent on 2FA */}
                             {twoFactorEnabled && (
                                <div className="mt-4 border border-gray-100 rounded-2xl overflow-hidden transition-all shadow-sm">
                                   <button
                                      onClick={() => setShowLinkedAccountsDropdown(!showLinkedAccountsDropdown)}
                                      className="w-full flex items-center justify-between p-5 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                                   >
                                      <div className="flex items-center gap-3">
                                         <Activity size={18} className="text-gray-400" />
                                         <span className="text-sm font-bold text-gray-700 uppercase tracking-widest">Manage Links & Devices</span>
                                      </div>
                                      <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${showLinkedAccountsDropdown ? 'rotate-180' : ''}`} />
                                   </button>

                                   <AnimatePresence>
                                      {showLinkedAccountsDropdown && (
                                         <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeOut' }}
                                            className="overflow-hidden bg-white border-t border-gray-100"
                                         >
                                            <div className="p-6 space-y-6">
                                               <SubTabs tabs={[{ id: 'password', label: 'OAuth Profiles' }, { id: 'sessions', label: 'Active Sessions' }]} active={accountSecurityTab} onChange={setAccountSecurityTab} />

                                               {accountSecurityTab === 'password' ? (
                                                  <div className="space-y-3 mt-2">
                                                     {[
                                                       { name: 'Google', detail: 'sarah.johnson@gmail.com', linked: true, color: '#4285f4' },
                                                       { name: 'Apple', detail: 'Authorized with FaceID', linked: true, color: '#000' },
                                                       { name: 'Meta', detail: 'Not connected', linked: false, color: '#1877f2' }
                                                     ].map(acc => (
                                                       <div key={acc.name} className="flex items-center justify-between p-4 rounded-xl bg-gray-50/30 border border-gray-100 transition-all hover:shadow-sm">
                                                          <div className="flex items-center gap-4">
                                                             <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shadow-inner" style={{ backgroundColor: acc.color }}>{acc.name[0]}</div>
                                                             <div className="min-w-0"><p className="text-sm font-black text-gray-900 leading-none mb-1">{acc.name}</p><p className="text-xs text-gray-400 truncate">{acc.detail}</p></div>
                                                          </div>
                                                          <button className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg border transition-all ${acc.linked ? 'text-gray-400 border-gray-200 hover:bg-gray-100' : 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100'}`}>{acc.linked ? 'Revoke' : 'Link'}</button>
                                                       </div>
                                                     ))}
                                                  </div>
                                               ) : (
                                                  <div className="space-y-3 mt-2">
                                                     {[
                                                       { device: 'iPhone 15 Pro', loc: 'San Francisco, CA', time: 'Active now', main: true },
                                                       { device: 'MacBook Pro 16"', loc: 'San Francisco, CA', time: 'Yesterday', main: false },
                                                     ].map((s, i) => (
                                                       <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 border border-gray-100 transition-all hover:shadow-sm">
                                                          <div className="flex items-center gap-4">
                                                             <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-sm"><Smartphone size={18} className="text-gray-400" /></div>
                                                             <div><p className="text-sm font-black text-gray-900 leading-none mb-1">{s.device}</p><p className="text-xs text-gray-400">{s.loc} · {s.time}</p></div>
                                                          </div>
                                                          {s.main ? <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">Primary Device</span> : <button className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Log out</button>}
                                                       </div>
                                                     ))}
                                                  </div>
                                               )}
                                            </div>
                                         </motion.div>
                                      )}
                                   </AnimatePresence>
                                </div>
                             )}
                          </div>
                       </SectionCard>
                    </div>

                    {/* Visibility & Actions Column */}
                    <div className="space-y-8">
                       <SectionCard title="Visibility Control">
                          <div className="grid grid-cols-3 gap-2 mb-8">
                             {['Public', 'Friends', 'Private'].map(v => (
                               <button key={v} onClick={() => setProfileVisibility(v)} className={`py-3 text-sm font-black rounded-xl border transition-all ${profileVisibility === v ? 'bg-gray-900 text-white border-gray-900 shadow-lg scale-105' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{v}</button>
                             ))}
                          </div>
                          <div className="space-y-4">
                             {[{ key: 'showEmail', label: 'Display email on profile' }, { key: 'showActivity', label: 'Show live travel activity' }, { key: 'analytics', label: 'Allow anonymous telemetry' }].map(p => (
                               <div key={p.key} className="flex items-center justify-between p-2"><span className="text-sm font-bold text-gray-600">{p.label}</span><Toggle checked={(privacyControls as any)[p.key]} onChange={() => setPrivacyControls(prev => ({ ...prev, [p.key]: !(prev as any)[p.key] }))} /></div>
                             ))}
                          </div>
                       </SectionCard>

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                          {[
                            { label: 'Help Center', icon: HelpCircle },
                            { label: 'Support', icon: MessageSquare },
                            { label: 'Sign Out', icon: LogOut, red: true },
                            { label: 'Delete Account', icon: Trash2, red: true },
                          ].map(b => (
                            <button key={b.label} className={`flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl border text-sm font-black uppercase tracking-widest transition-all ${b.red ? 'text-red-500 border-red-100 hover:bg-red-50' : 'text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                              <b.icon size={18} /> {b.label}
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {/* ═══════ SAVE BAR ═══════ */}
            <div ref={inlineSaveRef} className="p-8 sm:p-12 bg-gray-50/30">
              <div className="flex items-center justify-between">
                <div className="min-h-[32px]">
                  {hasChanges && !isSaving && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
                       <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                       <span className="text-sm font-black text-amber-600 uppercase tracking-[2px]">Unsaved Modifications</span>
                       <button onClick={handleDiscardChanges} className="text-sm font-black text-gray-400 hover:text-red-500 underline underline-offset-4 uppercase tracking-[2px] ml-4 transition-all">Discard</button>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  className={`flex items-center gap-3 px-10 py-4 rounded-2xl text-base font-black uppercase tracking-widest transition-all ${
                    !hasChanges || isSaving ? 'bg-gray-100 text-gray-300' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-2xl scale-105 active:scale-95'
                  }`}
                >
                  {isSaving && <Loader2 size={18} className="animate-spin" />}
                  {isSaving ? 'Processing...' : 'Commit Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="py-12 text-center opacity-50">
           <p className="text-[10px] font-black text-gray-300 uppercase tracking-[6px]">Travyl Core System · Architecture v2.4.1</p>
        </footer>
      </main>

      {/* Floating Save Trigger */}
      <div className={`fixed bottom-10 right-10 z-40 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        !inlineSaveVisible && hasChanges ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-16 opacity-0 scale-90 pointer-events-none'
      }`}>
        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-3 px-8 py-5 bg-gray-900 text-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-gray-800 active:scale-95 transition-all border border-white/10 group">
           {isSaving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} className="group-hover:scale-110 transition-transform" />}
           <span className="text-base font-black uppercase tracking-widest">Apply Updates</span>
        </button>
      </div>

      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSaveAndContinue={handleDialogSaveAndContinue}
        onDiscard={handleDialogDiscard}
        onCancel={handleDialogCancel}
        isSaving={isSaving}
        targetLabel={pendingTabChange ? tabLabels[pendingTabChange] : undefined}
      />
    </div>
  );
}
