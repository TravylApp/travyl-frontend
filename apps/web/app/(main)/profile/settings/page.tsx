"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Compass, Bell, Settings, CheckCircle, Plane, Hotel, Loader2, AlertCircle, Plus, Eye, Check, Shield, Smartphone, LogOut, Star, HelpCircle, MessageSquare, Trash2, X, ChevronDown, Pencil, ClipboardList, Activity, Zap } from 'lucide-react';
import { AvatarUpload } from '@/components/AvatarUpload';
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { LoadingBar } from '@/components/LoadingBar';
import Navbar from '@/components/navbar';
import { Footer, OceanWave } from '@/components/home';
import { useAuthStore, useSettingsStore, supabase, fetchProfile } from '@travyl/shared';
import type { Profile } from '@travyl/shared';

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
    <div className="flex h-14 items-center gap-2 border-b border-border px-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            active === tab.id ? "bg-primary text-white" : "text-foreground hover:bg-border"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const currency = useSettingsStore((s) => s.currency);
  const distanceUnits = useSettingsStore((s) => s.distanceUnits);
  const travelStyle = useSettingsStore((s) => s.travelStyle);
  const pushNotifications = useSettingsStore((s) => s.pushNotifications);
  const emailNotifications = useSettingsStore((s) => s.emailNotifications);
  const togglePush = useSettingsStore((s) => s.togglePushNotifications);
  const toggleEmail = useSettingsStore((s) => s.toggleEmailNotifications);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Back to Profile */}
      <Link
        href="/profile"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to Profile
      </Link>

      <h1 className="text-2xl font-serif font-normal text-foreground tracking-wide">Settings</h1>

      {/* Account */}
      <SectionHeader title="Account" />
      <div className="overflow-hidden rounded-xl border border-border">
        {/* TODO: Navigate to email change flow */}
        <SettingsRow label="Email" value={user?.email ?? '—'} onClick={() => {}} />
        {/* TODO: Navigate to password change flow */}
        <SettingsRow label="Change Password" onClick={() => {}} />
        {/* TODO: Confirm + call Supabase delete user */}
        <SettingsRow label="Delete Account" danger onClick={() => {}} />
      </div>

      {/* Preferences */}
      <SectionHeader title="Preferences" />
      <div className="overflow-hidden rounded-xl border border-border">
        {/* TODO: Open currency picker */}
        <SettingsRow label="Currency" value={currency} onClick={() => {}} />
        {/* TODO: Open distance unit picker */}
        <SettingsRow label="Distance Units" value={distanceUnits === 'miles' ? 'Miles' : 'Kilometers'} onClick={() => {}} />
        {/* TODO: Open travel style picker */}
        <SettingsRow label="Default Travel Style" value={travelStyle.charAt(0).toUpperCase() + travelStyle.slice(1)} onClick={() => {}} />
      </div>

      {/* Notifications */}
      <SectionHeader title="Notifications" />
      <div className="overflow-hidden rounded-xl border border-border">
        <SettingsToggle label="Push Notifications" enabled={pushNotifications} onToggle={togglePush} />
        <SettingsToggle label="Email Notifications" enabled={emailNotifications} onToggle={toggleEmail} />
      </div>

      {/* About */}
      <SectionHeader title="About" />
      <div className="overflow-hidden rounded-xl border border-border">
        <SettingsRow label="Version" value="1.0.0" />
        {/* TODO: Open terms URL */}
        <SettingsRow label="Terms of Service" onClick={() => {}} />
        {/* TODO: Open privacy URL */}
        <SettingsRow label="Privacy Policy" onClick={() => {}} />
      </div>

      <div className="h-12" />
    </div>
  );
}
