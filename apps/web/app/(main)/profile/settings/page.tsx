"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, LogOut, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AvatarUpload } from "@/components/AvatarUpload";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { LoadingBar } from "@/components/LoadingBar";
import { useAuthStore, supabase, useSettingsStore, CURRENCIES } from "@travyl/shared";
import { fetchProfile, updateProfile, uploadAvatar, updateUserPassword } from "@travyl/shared";
import type { Profile } from "@travyl/shared";

interface ProfileForm {
  avatar: string | null;
  displayName: string;
  city: string;
  country: string;
}

const EMPTY_FORM: ProfileForm = { avatar: null, displayName: "", city: "", country: "" };

type SectionId = "profile" | "display" | "password";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "display", label: "Display" },
  { id: "password", label: "Password" },
];

export default function ProfileSettings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, session, loading: authLoading } = useAuthStore();
  const signOut = useAuthStore((s) => s.signOut);
  const distanceUnits = useSettingsStore((s) => s.distanceUnits);
  const setDistanceUnits = useSettingsStore((s) => s.setDistanceUnits);
  const currency = useSettingsStore((s) => s.currency);
  const setCurrency = useSettingsStore((s) => s.setCurrency);

  const [section, setSection] = useState<SectionId>("profile");
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [original, setOriginal] = useState<ProfileForm>(EMPTY_FORM);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileChanged =
    form.avatar !== original.avatar ||
    form.displayName !== original.displayName ||
    form.city !== original.city ||
    form.country !== original.country;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (profileChanged || newPassword) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [profileChanged, newPassword]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        if (!supabase) {
          setError("Supabase is not configured. Check your environment variables.");
          return;
        }
        if (!user) return;
        const profile = await fetchProfile(user.id);
        if (cancelled) return;
        const next: ProfileForm = {
          avatar: profile?.avatar_url ?? null,
          displayName:
            profile?.display_name ??
            (user.user_metadata?.display_name as string | undefined) ??
            (user.user_metadata?.name as string | undefined) ??
            "",
          city: profile?.city ?? "",
          country: profile?.country ?? "",
        };
        setForm(next);
        setOriginal(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, session, authLoading]);

  const handleSaveProfile = useCallback(async () => {
    if (!profileChanged) return;
    if (!user || !session) {
      toast.error("You must be signed in to save changes");
      return;
    }
    setIsSavingProfile(true);
    try {
      let avatarUrl = form.avatar;
      if (form.avatar && form.avatar.startsWith("data:image/")) {
        try {
          avatarUrl = await uploadAvatar(user.id, form.avatar);
        } catch {
          toast.error("Failed to upload avatar");
          return;
        }
      }
      const updates: Partial<Pick<Profile, "display_name" | "avatar_url" | "city" | "country">> = {};
      if (form.displayName.trim() !== original.displayName.trim()) {
        updates.display_name = form.displayName.trim() || null;
      }
      if (avatarUrl !== original.avatar) {
        updates.avatar_url = avatarUrl;
      }
      if (form.city.trim() !== original.city.trim()) {
        updates.city = form.city.trim() || null;
      }
      if (form.country.trim() !== original.country.trim()) {
        updates.country = form.country.trim() || null;
      }
      if (Object.keys(updates).length > 0) {
        await updateProfile(user.id, updates);
        await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      }
      setOriginal({ ...form, avatar: avatarUrl });
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  }, [profileChanged, user, session, form, original, queryClient]);

  const handleSavePassword = useCallback(async () => {
    if (!user || !session) {
      toast.error("You must be signed in to change your password");
      return;
    }
    if (!currentPassword) {
      toast.error("Enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setIsSavingPassword(true);
    try {
      const { error: signInError } = await supabase!.auth.signInWithPassword({
        email: user.email || "",
        password: currentPassword,
      });
      if (signInError) {
        toast.error("Current password is incorrect");
        return;
      }
      await updateUserPassword(newPassword);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setIsSavingPassword(false);
    }
  }, [user, session, currentPassword, newPassword]);

  const handleSignOut = async () => {
    if ((profileChanged || newPassword) && !window.confirm("You have unsaved changes. Sign out anyway?")) return;
    try {
      await signOut();
      toast.success("Signed out");
      router.push("/");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-[#1e3a5f] animate-spin" />
          <p className="text-sm text-gray-500">Loading settings…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Couldn&apos;t load settings</h1>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#16314f] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const initials = form.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || (user?.email?.[0]?.toUpperCase() ?? "?");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <LoadingBar isLoading={isSavingProfile || isSavingPassword} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <button
          onClick={() => router.push("/profile")}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to profile
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your profile, preferences, and password.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
            {/* Left rail */}
            <aside className="p-6 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col">
              <div className="flex flex-col items-center text-center pb-6 mb-2">
                <div className="relative">
                  {form.avatar ? (
                    <img
                      src={form.avatar}
                      alt={form.displayName}
                      className="w-16 h-16 rounded-full object-cover shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-lg font-bold shadow-md">
                      {initials}
                    </div>
                  )}
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-900 truncate max-w-full">
                  {form.displayName || user?.email?.split("@")[0] || "You"}
                </p>
                <p className="text-xs text-gray-500 truncate max-w-full">{user?.email}</p>
              </div>

              <nav className="space-y-1">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSection(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      section === s.id ? "bg-[#1e3a5f]/10 text-[#1e3a5f]" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </nav>

              <div className="mt-auto pt-4 border-t border-gray-100">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </aside>

            {/* Right pane */}
            <div className="p-6 sm:p-8 min-h-[420px]">
              {section === "profile" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <AvatarUpload
                      currentImage={form.avatar || undefined}
                      onImageChange={(url) => setForm((f) => ({ ...f, avatar: url }))}
                      size={64}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Profile photo</p>
                      <p className="text-xs text-gray-500">Click the photo to change it.</p>
                    </div>
                  </div>

                  <Field label="Display name" htmlFor="displayName">
                    <input
                      id="displayName"
                      value={form.displayName}
                      onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                      placeholder="Your name"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Email" htmlFor="email">
                    <input
                      id="email"
                      type="email"
                      value={user?.email ?? ""}
                      disabled
                      className={`${inputClass} opacity-60 cursor-not-allowed`}
                    />
                    <p className="text-xs text-gray-500 mt-1">Contact support to change your email.</p>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="City" htmlFor="city">
                      <input
                        id="city"
                        value={form.city}
                        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                        placeholder="San Francisco"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Country" htmlFor="country">
                      <input
                        id="country"
                        value={form.country}
                        onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                        placeholder="United States"
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    {profileChanged && (
                      <button
                        onClick={() => setForm(original)}
                        disabled={isSavingProfile}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                      >
                        Discard
                      </button>
                    )}
                    <button
                      onClick={handleSaveProfile}
                      disabled={!profileChanged || isSavingProfile}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#16314f] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      {isSavingProfile && <Loader2 size={14} className="animate-spin" />}
                      {isSavingProfile ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </div>
              )}

              {section === "display" && (
                <div className="space-y-5">
                  <Field label="Units" htmlFor="distanceUnits">
                    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                      {(["miles", "kilometers"] as const).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => setDistanceUnits(unit)}
                          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            distanceUnits === unit ? "bg-[#1e3a5f] text-white" : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          {unit === "miles" ? "Miles · °F" : "Kilometers · °C"}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Used for distance and temperature on trip pages. Saved automatically.</p>
                  </Field>

                  <Field label="Currency" htmlFor="currency">
                    <select
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={inputClass}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.code} · {c.name} ({c.symbol})</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">Used to display trip budgets and prices. Saved automatically.</p>
                  </Field>
                </div>
              )}

              {section === "password" && (
                <div className="space-y-5">
                  <Field label="Current password" htmlFor="currentPassword">
                    <div className="relative">
                      <input
                        id="currentPassword"
                        type={showCurrent ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={showCurrent ? "Hide password" : "Show password"}
                      >
                        {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>
                  <Field label="New password" htmlFor="newPassword">
                    <div className="relative">
                      <input
                        id="newPassword"
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={showNew ? "Hide password" : "Show password"}
                      >
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {newPassword && <div className="mt-2"><PasswordStrengthMeter password={newPassword} /></div>}
                  </Field>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={handleSavePassword}
                      disabled={!currentPassword || !newPassword || isSavingPassword}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] hover:bg-[#16314f] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      {isSavingPassword && <Loader2 size={14} className="animate-spin" />}
                      {isSavingPassword ? "Updating…" : "Update password"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const inputClass =
  "w-full h-10 px-3 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 transition-colors";

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
