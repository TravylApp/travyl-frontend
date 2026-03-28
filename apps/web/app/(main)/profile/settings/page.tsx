"use client";

import { useState } from "react";
import Link from "next/link";

import { useSettingsStore, useAuthStore } from '@travyl/shared';
import { CurrencyPicker } from '@/components/settings/CurrencyPicker';

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="px-1 pt-8 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </h2>
  );
}

function SettingsRow({
  label,
  value,
  onClick,
  danger,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-14 w-full items-center justify-between border-b border-border px-4 text-left transition-colors hover:bg-muted/50"
    >
      <span className={danger ? "text-red-600 dark:text-red-400" : "text-foreground"}>
        {label}
      </span>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
    </button>
  );
}

function SettingsToggle({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-border px-4">
      <span className="text-foreground">{label}</span>
      <button
        onClick={onToggle}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          enabled ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
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
        <SettingsRow label="Currency" value={currency} onClick={() => setShowCurrencyPicker(true)} />
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

      {showCurrencyPicker && (
        <CurrencyPicker onClose={() => setShowCurrencyPicker(false)} />
      )}
    </div>
  );
}
