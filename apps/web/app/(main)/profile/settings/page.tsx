"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { User, Compass, Bell, Settings, CheckCircle, Plane, Hotel, Loader2, AlertCircle, Plus, Eye, Check, Shield, Smartphone, LogOut, Star, HelpCircle, MessageSquare, Trash2, X, ChevronDown, Pencil, ClipboardList, Activity, Zap, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { AvatarUpload } from '@/components/AvatarUpload';
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { LoadingBar } from '@/components/LoadingBar';
import { useAuthStore, supabase } from '@travyl/shared';
import { fetchProfile, updateProfile, uploadAvatar, updateUserMetadata, updateUserPassword, fetchTrips } from '@travyl/shared';
import type { Profile, Trip } from '@travyl/shared';

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
    <div className={`bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-border bg-muted/50 flex items-center justify-between">
          <span className="text-sm font-bold tracking-[1.5px] text-muted-foreground uppercase">{title}</span>
        </div>
      )}
      <div className="p-6 flex-1">{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-bold tracking-[1.2px] text-muted-foreground uppercase mb-4">{children}</p>;
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-tight">{children}</label>;
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
          className="w-full h-12 px-4 text-lg text-card-foreground bg-card border border-border rounded-xl hover:border-border/80 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all"
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
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 focus-visible:outline-none ${checked ? 'bg-primary' : 'bg-muted'} ${disabled ? 'opacity-50' : ''}`}
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
        selected ? 'bg-primary/10 border-primary/20 text-primary font-semibold shadow-sm' : 'bg-card border-border text-muted-foreground hover:border-border/80'
      }`}
    >
      {color && (
        <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
          {initials}
        </span>
      )}
      <span className="truncate max-w-[120px]">{label}</span>
      {selected && <Check size={14} className="text-primary shrink-0" />}
    </button>
  );
}

function PillToggle({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
        selected ? 'bg-foreground text-background border-foreground shadow-md' : 'bg-card text-muted-foreground border-border hover:border-border/80'
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
}): React.ReactNode {
  return (
    <div className="flex gap-4 mb-6 border-b border-border">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-2 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
            active === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
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
      <span className="text-base text-card-foreground font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground text-lg font-bold transition-all">-</button>
        <span className="w-6 text-center text-base font-bold text-card-foreground">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground text-lg font-bold transition-all">+</button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────
export default function ProfileSettings() {
  const queryClient = useQueryClient();
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
  const [trips, setTrips] = useState<Trip[]>([]);

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

  const [originalTravelStyle, setOriginalTravelStyle] = useState<{
    homeAirport: string; typicalDuration: number; budget: string; travelPace: string;
    travelers: { adults: number; children: number; infants: number; pets: number };
    selectedAirlines: string[]; selectedHotels: string[];
    selectedStayTypes: string[]; selectedInterests: string[];
    selectedRegions: string[];
  }>({
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
          setError('Sign In to View');
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
          profilePhoto: profile?.avatar_url || null,
          firstName: profile?.display_name || user.user_metadata?.display_name || user.user_metadata?.name || '',
          lastName: user.user_metadata?.lastName || '',
          email: user.email || '',
          phone: user.phone || '',
          city: profile?.city || user.user_metadata?.city || '',
          country: profile?.country || user.user_metadata?.country || '',
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
          profilePhoto: profile?.avatar_url || null,
          firstName: profile?.display_name || user.user_metadata?.display_name || user.user_metadata?.name || '',
          lastName: user.user_metadata?.lastName || '',
          email: user.email || '',
          phone: user.phone || '',
          city: profile?.city || user.user_metadata?.city || '',
          country: profile?.country || user.user_metadata?.country || '',
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

        // Fetch user's trips for stats
        try {
          const userTrips = await fetchTrips(user.id);
          setTrips(userTrips);
        } catch (tripErr) {
          // Continue without trips - stats will show 0
        }

      } catch (err) {
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
    if (!user || !session) { toast.error('You must be signed in to save settings'); return false; }

    setIsSaving(true);
    try {
      let finalAvatarUrl = formData.profilePhoto;

      // If the avatar is a base64 string (newly uploaded), upload it to storage
      if (formData.profilePhoto && formData.profilePhoto.startsWith('data:image/')) {
        try {
          finalAvatarUrl = await uploadAvatar(user.id, formData.profilePhoto);
        } catch (uploadErr) {
          toast.error('Failed to upload image. Please try again.');
          setIsSaving(false);
          return false;
        }
      }

      // Update profile fields in profiles table
      if (formData.firstName || formData.city || formData.country || formData.profilePhoto !== originalFormData.profilePhoto) {
        await updateProfile(user.id, {
          display_name: formData.firstName || null,
          avatar_url: finalAvatarUrl || null,
          city: formData.city || null,
          country: formData.country || null,
        });
      }

      // Update user metadata in auth
      const metadataUpdates: Record<string, unknown> = {
        display_name: formData.firstName || null,
        avatar_url: finalAvatarUrl && !finalAvatarUrl.startsWith('data:') ? finalAvatarUrl : null, // Only store URLs, not base64 data
        lastName: formData.lastName || null,
        phone: formData.phone || null,
        emergencyName: formData.emergencyName || null,
        emergencyPhone: formData.emergencyPhone || null,
        emergencyRelation: formData.emergencyRelation || null,
        dietaryRequirements: formData.dietaryRequirements || null,
        currency: formData.currency || null,
        language: formData.language || null,
        timezone: formData.timezone || null,
        distanceUnit: formData.distanceUnit || null,
        temperatureUnit: formData.temperatureUnit || null,
      };

      // Only include non-null values
      const cleanMetadataUpdates = Object.fromEntries(
        Object.entries(metadataUpdates).filter(([_, v]) => v !== null)
      );

      if (Object.keys(cleanMetadataUpdates).length > 0) {
        await updateUserMetadata(cleanMetadataUpdates);
      }

      // Invalidate profile query to update navbar and other components
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });

      // Update password if provided
      if (formData.newPassword && formData.currentPassword) {
        // First verify current password by attempting to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email || '',
          password: formData.currentPassword,
        });

        if (signInError) {
          toast.error('Current password is incorrect');
          return false;
        }

        await updateUserPassword(formData.newPassword);
        toast.success('Password updated successfully!');
      }

      if (!inlineSaveVisible) {
        setShowStickySuccess(true);
        if (stickySuccessTimer.current) clearTimeout(stickySuccessTimer.current);
        stickySuccessTimer.current = setTimeout(() => setShowStickySuccess(false), 1800);
      } else {
        toast.success('Settings saved successfully!');
      }
      snapshotAll();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings. Please try again.');
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
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="flex items-center justify-center p-6 pt-24">
          <div className="text-center">
            {/* Travyl Logo */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="text-3xl font-black text-[#1e3a5f] tracking-wider">TRAVYL</span>
              <svg
                viewBox="0 0 64 64"
                className="w-10 h-10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M60 10 L20 36 L6 34 Z" fill="#ffffff" stroke="#1e3a5f" strokeWidth="2"/>
                <path d="M48 48 L30 40 L26 38 L60 10 Z" fill="#ffffff" stroke="#1e3a5f" strokeWidth="2"/>
                <path d="M52 16 L26 38 L24 50 L20 36 Z" fill="#ffffff" stroke="#1e3a5f" strokeWidth="2"/>
              </svg>
            </div>

            <Loader2 size={48} className="text-[#1e3a5f] animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-[#1e3a5f] mb-2">Loading Settings</h2>
            <p className="text-gray-500">Please wait while we load your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e0f2fe]">
        <div className="flex items-center justify-center p-6 pt-24">
          <div className="max-w-md w-full text-center bg-white rounded-3xl shadow-2xl p-10">
          {/* Travyl Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="text-3xl font-black text-[#1e3a5f] tracking-wider">TRAVYL</span>
            <svg
              viewBox="0 0 64 64"
              className="w-10 h-10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M60 10 L20 36 L6 34 Z" fill="#ffffff" stroke="#1e3a5f" strokeWidth="2"/>
              <path d="M48 48 L30 40 L26 38 L60 10 Z" fill="#ffffff" stroke="#1e3a5f" strokeWidth="2"/>
              <path d="M52 16 L26 38 L24 50 L20 36 Z" fill="#ffffff" stroke="#1e3a5f" strokeWidth="2"/>
            </svg>
          </div>

          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-1">Access Denied</h2>
          <h3 className="text-2xl font-bold text-[#1e3a5f] mb-6">{error}</h3>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2a4a6f] transition-all font-bold shadow-lg"
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
    );
  }

  if (error && supabase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e0f2fe]">
        <div className="flex items-center justify-center p-6 pt-24">
          <div className="max-w-md w-full text-center bg-white rounded-[32px] shadow-2xl p-10 border-2 border-dashed border-red-100">
            <div className="w-28 h-28 bg-red-50 rounded-full flex items-center justify-center mb-10 relative shadow-inner mx-auto">
              <X size={56} className="text-red-200" />
            </div>
            <h3 className="text-[#314158] text-3xl font-bold mb-4">Unable to Load Profile</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-12 text-lg leading-relaxed">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-10 py-4 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-2xl transition-all shadow-xl hover:shadow-2xl font-bold flex items-center gap-3 mx-auto active:scale-95"
            >
              <Loader2 size={20} />
              Try Again
            </button>
          </div>
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

  // Calculate user stats from trips
  const calculateUserStats = () => {
    const tripsCount = trips.length;

    // Extract unique cities from trip destinations
    const uniqueCities = new Set<string>();
    trips.forEach(trip => {
      if (trip.destination) {
        uniqueCities.add(trip.destination);
      }
    });
    const citiesCount = uniqueCities.size || Math.max(tripsCount * 2, 0);

    // Calculate XP
    let xp = 100; // Base XP for signing up
    trips.forEach(trip => {
      xp += 50; // Base XP per trip
      if (trip.trip_context?.explore_items) {
        xp += trip.trip_context.explore_items.length * 10;
      }
    });

    const currentLevel = Math.floor(xp / 1000) + 1;
    const xpForCurrentLevel = currentLevel * 1000;
    const xpInCurrentLevel = xp % 1000;
    const xpProgress = (xpInCurrentLevel / 1000) * 100;

    return {
      tripsCount,
      citiesCount,
      xpCurrent: xp,
      xpMax: xpForCurrentLevel,
      xpProgress,
      level: currentLevel
    };
  };

  const userStats = calculateUserStats();

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
    <div className="min-h-screen bg-background">
      <LoadingBar isLoading={isLoading || isTabLoading || isSaving} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-12">
        {/* Back Button */}
        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Profile</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl text-foreground tracking-tight font-bold">Settings</h1>
          <p className="text-xl text-muted-foreground mt-2">Manage your profile, preferences and security</p>
        </div>

        {/* Tabs — Matches Main Layout Style */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide border-b border-border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              disabled={isTabLoading}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-lg whitespace-nowrap transition-all touch-manipulation font-semibold ${
                activeTab === tab.id
                  ? 'bg-foreground text-background shadow-lg'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"><Skeleton /></div>
        ) : (
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden divide-y divide-border">

            {/* ═══════ PROFILE ═══════ */}
            {activeTab === 'profile' && (
              <div className="p-6 sm:p-10 space-y-8">
                <div className="flex flex-col lg:flex-row gap-10">
                  {/* Left: Bio/Avatar Info */}
                  <div className="lg:w-[320px] flex flex-col items-center text-center p-8 rounded-[32px] bg-muted/50 border border-border shadow-inner shrink-0">
                    <AvatarUpload currentImage={formData.profilePhoto || undefined} onImageChange={url => updateForm('profilePhoto', url)} hideButtons />
                    <div className="mt-6 w-full">
                       {isEditingName ? (
                         <div className="flex flex-col gap-3">
                            <SettingsInput id="f" label="FIRST NAME" value={formData.firstName} onChange={v => updateForm('firstName', v)} />
                            <SettingsInput id="l" label="LAST NAME" value={formData.lastName} onChange={v => updateForm('lastName', v)} />
                            <button onClick={() => setIsEditingName(false)} className="h-10 bg-primary text-primary-foreground rounded-xl text-sm font-bold w-full mt-2 shadow-md hover:bg-primary/90 transition-colors">Save Name</button>
                         </div>
                       ) : (
                         <div className="group cursor-pointer flex items-center justify-center gap-2" onClick={() => setIsEditingName(true)}>
                            <h2 className="text-2xl font-black text-card-foreground group-hover:text-primary transition-colors tracking-tight">{formData.firstName} {formData.lastName}</h2>
                            <Pencil size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                         </div>
                       )}
                       <div className="mt-6 space-y-2">
                          <div className="flex items-center justify-between px-1">
                             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Progress</span>
                             <span className="text-[10px] font-black text-primary uppercase tracking-widest">{userStats.xpCurrent}/{userStats.xpMax} XP</span>
                          </div>
                          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
                             <div className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${userStats.xpProgress}%` }} />
                          </div>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mt-10 pt-8 border-t border-border w-full">
                       <div className="text-left"><p className="text-[10px] font-black text-muted-foreground uppercase tracking-[2px] leading-none mb-2">Trips</p><p className="text-2xl font-black text-card-foreground leading-none">{userStats.tripsCount}</p></div>
                       <div className="text-left"><p className="text-[10px] font-black text-muted-foreground uppercase tracking-[2px] leading-none mb-2">Cities</p><p className="text-2xl font-black text-card-foreground leading-none">{userStats.citiesCount}</p></div>
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
                                <div className="flex items-center h-12 bg-card border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                   <button onClick={() => setTypicalDuration(Math.max(1, typicalDuration-1))} className="w-12 h-full bg-muted text-muted-foreground hover:text-foreground font-black text-xl transition-colors border-r border-border">-</button>
                                   <span className="flex-1 text-center text-sm font-bold text-card-foreground tracking-tight">{typicalDuration} Days</span>
                                   <button onClick={() => setTypicalDuration(typicalDuration+1)} className="w-12 h-full bg-muted text-muted-foreground hover:text-foreground font-black text-xl transition-colors border-l border-border">+</button>
                                </div>
                             </div>
                             <SettingsInput id="bdg" label="AVG BUDGET" value={budget} onChange={setBudget} />
                             <div>
                                <FieldLabel>TRAVEL PACE</FieldLabel>
                                <div className="relative">
                                  <select value={travelPace} onChange={e => setTravelPace(e.target.value)} className="w-full h-12 px-4 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold appearance-none cursor-pointer">
                                     {['Relaxed', 'Balanced', 'Fast-Paced'].map(p => <option key={p} value={p}>{p}</option>)}
                                  </select>
                                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
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
                            <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-card hover:bg-muted transition-colors border border-transparent hover:border-border">
                               <div className="pr-6"><p className="text-base font-bold text-card-foreground leading-tight">{item.title}</p><p className="text-sm text-muted-foreground mt-1">{item.desc}</p></div>
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
                            <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-card hover:bg-muted transition-colors border border-transparent hover:border-border">
                               <div className="pr-6"><p className="text-base font-bold text-card-foreground leading-tight">{item.title}</p><p className="text-sm text-muted-foreground mt-1">{item.desc}</p></div>
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
                             <SettingsInput id="cpw" label="CURRENT PASSWORD" value={formData.currentPassword} onChange={v => updateForm('currentPassword', v)} type={showCurrentPassword ? 'text' : 'password'} suffix={<button onClick={() => setShowCurrentPassword(!showCurrentPassword)}><Eye size={18} className="text-muted-foreground hover:text-foreground transition-colors" /></button>} />
                             <SettingsInput id="npw" label="NEW PASSWORD" value={formData.newPassword} onChange={v => updateForm('newPassword', v)} type={showNewPassword ? 'text' : 'password'} placeholder="min. 8 characters" suffix={<button onClick={() => setShowNewPassword(!showNewPassword)}><Eye size={18} className="text-muted-foreground hover:text-foreground transition-colors" /></button>} />
                             {formData.newPassword && <PasswordStrengthMeter password={formData.newPassword} />}

                             <div className="pt-8 mt-8 border-t border-border flex items-center justify-between">
                                <div className="flex items-center gap-3"><Shield size={20} className="text-primary" /><span className="text-base font-bold text-card-foreground uppercase tracking-tight">2FA Protection</span></div>
                                <Toggle checked={twoFactorEnabled} onChange={() => setTwoFactorEnabled(!twoFactorEnabled)} />
                             </div>

                             {/* Linked Accounts & Devices Dropdown - Dependent on 2FA */}
                             {twoFactorEnabled && (
                                <div className="mt-4 border border-border rounded-2xl overflow-hidden transition-all shadow-sm">
                                   <button
                                      onClick={() => setShowLinkedAccountsDropdown(!showLinkedAccountsDropdown)}
                                      className="w-full flex items-center justify-between p-5 bg-muted/50 hover:bg-muted transition-colors"
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
                                            className="overflow-hidden bg-card border-t border-border"
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
                                                       <div key={acc.name} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border transition-all hover:shadow-sm">
                                                          <div className="flex items-center gap-4">
                                                             <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shadow-inner" style={{ backgroundColor: acc.color }}>{acc.name[0]}</div>
                                                             <div className="min-w-0"><p className="text-sm font-black text-card-foreground leading-none mb-1">{acc.name}</p><p className="text-xs text-muted-foreground truncate">{acc.detail}</p></div>
                                                          </div>
                                                          <button className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg border transition-all ${acc.linked ? 'text-muted-foreground border-border hover:bg-muted' : 'text-primary border-primary/20 bg-primary/10 hover:bg-primary/20'}`}>{acc.linked ? 'Revoke' : 'Link'}</button>
                                                       </div>
                                                     ))}
                                                  </div>
                                               ) : (
                                                  <div className="space-y-3 mt-2">
                                                     {[
                                                       { device: 'iPhone 15 Pro', loc: 'San Francisco, CA', time: 'Active now', main: true },
                                                       { device: 'MacBook Pro 16"', loc: 'San Francisco, CA', time: 'Yesterday', main: false },
                                                     ].map((s, i) => (
                                                       <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border transition-all hover:shadow-sm">
                                                          <div className="flex items-center gap-4">
                                                             <div className="w-10 h-10 bg-card border border-border rounded-xl flex items-center justify-center shadow-sm"><Smartphone size={18} className="text-muted-foreground" /></div>
                                                             <div><p className="text-sm font-black text-card-foreground leading-none mb-1">{s.device}</p><p className="text-xs text-muted-foreground">{s.loc} · {s.time}</p></div>
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
                               <button key={v} onClick={() => setProfileVisibility(v)} className={`py-3 text-sm font-black rounded-xl border transition-all ${profileVisibility === v ? 'bg-foreground text-background border-foreground shadow-lg scale-105' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}>{v}</button>
                             ))}
                          </div>
                          <div className="space-y-4">
                             {[{ key: 'showEmail', label: 'Display email on profile' }, { key: 'showActivity', label: 'Show live travel activity' }, { key: 'analytics', label: 'Allow anonymous telemetry' }].map(p => (
                               <div key={p.key} className="flex items-center justify-between p-2"><span className="text-sm font-bold text-card-foreground">{p.label}</span><Toggle checked={(privacyControls as any)[p.key]} onChange={() => setPrivacyControls(prev => ({ ...prev, [p.key]: !(prev as any)[p.key] }))} /></div>
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
                            <button key={b.label} className={`flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl border text-sm font-black uppercase tracking-widest transition-all ${b.red ? 'text-red-500 border-red-100 hover:bg-red-50' : 'text-muted-foreground border-border hover:bg-muted'}`}>
                              <b.icon size={18} /> {b.label}
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {/* ═══════ SAVE BAR ═══════ */}
            <div ref={inlineSaveRef} className="p-8 sm:p-12 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="min-h-[32px]">
                  {hasChanges && !isSaving && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
                       <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                       <span className="text-sm font-black text-amber-600 uppercase tracking-[2px]">Unsaved Modifications</span>
                       <button onClick={handleDiscardChanges} className="text-sm font-black text-muted-foreground hover:text-red-500 underline underline-offset-4 uppercase tracking-[2px] ml-4 transition-all">Discard</button>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  className={`flex items-center gap-3 px-10 py-4 rounded-2xl text-base font-black uppercase tracking-widest transition-all ${
                    !hasChanges || isSaving ? 'bg-muted text-muted-foreground' : 'bg-foreground text-background hover:bg-foreground/90 shadow-2xl scale-105 active:scale-95'
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
        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-3 px-8 py-5 bg-foreground text-background rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-foreground/90 active:scale-95 transition-all border border-white/10 group">
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
