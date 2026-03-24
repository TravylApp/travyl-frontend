# Settings in Spotlight Search — Design Spec

**Date:** 2026-03-24
**Status:** Approved

## Goal

Make all profile settings searchable and actionable from the GlobalCommandPalette (Ctrl+K). Toggle settings flip inline, picker settings expand a sub-view with options, and all state persists to Supabase via a Zustand store.

## Settings Store

New Zustand store at `packages/shared/src/stores/settingsStore.ts`:

```ts
interface SettingsState {
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'MXN'
  distanceUnits: 'miles' | 'kilometers'
  travelStyle: 'balanced' | 'budget' | 'luxury' | 'adventure' | 'relaxed'
  pushNotifications: boolean
  emailNotifications: boolean

  // Actions
  setCurrency: (v: SettingsState['currency']) => void
  setDistanceUnits: (v: SettingsState['distanceUnits']) => void
  setTravelStyle: (v: SettingsState['travelStyle']) => void
  togglePushNotifications: () => void
  toggleEmailNotifications: () => void
  hydrate: (prefs: Partial<SettingsState>) => void
}
```

**Defaults:**
- currency: `'USD'`
- distanceUnits: `'miles'`
- travelStyle: `'balanced'`
- pushNotifications: `true`
- emailNotifications: `false`

**Hydration lifecycle:**
- A `useEffect` in `Providers` watches `useAuthStore.user`. When user becomes non-null, fetch `profiles.preferences` and call `hydrate()`.
- `hydrate()` validates incoming values against allowed unions, falling back to defaults for invalid/missing values (guards against stale DB data or manual edits).
- On sign-out (user becomes null), call `hydrate({})` to reset store to defaults — prevents preference leakage between users.
- Settings items appear in the palette only when the user is authenticated. Before auth resolves, the Settings group is hidden.

**Persistence:** Each setter writes to the store immediately (optimistic), then fires a background `supabase.from('profiles').update({ preferences })` call. No loading states needed — store is always the source of truth for reads. Failed writes log to `console.error` — a toast notification can be added later.

## DB Migration

Add `preferences` jsonb column to the existing `profiles` table:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}';
```

No RLS changes needed — `profiles` already has user-scoped policies. Verify whether column already exists in production before applying — the `IF NOT EXISTS` guard makes the migration idempotent.

## Palette Integration

### New Item Type

Add `SettingItem` to `GlobalCommandPalette`:

```ts
interface SettingToggleItem {
  type: 'setting-toggle'
  id: string
  label: string
  keywords: string[]
  enabled: boolean
  onToggle: () => void
}

interface SettingPickerItem {
  type: 'setting-picker'
  id: string
  label: string
  keywords: string[]
  currentValue: string
  options: { value: string; label: string }[]
  onSelect: (value: string) => void
}

interface SettingLinkItem {
  type: 'setting-link'
  id: string
  label: string
  keywords: string[]
  path: string
}
```

`PaletteItem` union becomes: `NavItem | TripItem | CommandItem | SettingToggleItem | SettingPickerItem | SettingLinkItem`

### Settings Registry

Static list of all settings with their types, keywords, and store bindings:

| Setting | Type | Keywords |
|---------|------|----------|
| Currency | picker | currency, money, usd, eur, gbp, jpy, cad, aud, mxn |
| Distance Units | picker | distance, units, miles, kilometers, km |
| Travel Style | picker | travel, style, balanced, budget, luxury, adventure, relaxed |
| Push Notifications | toggle | push, notifications, alerts |
| Email Notifications | toggle | email, notifications, alerts, mail |
| Email (account) | link → /profile/settings | email, account |
| Change Password | link → /profile/settings | password, security |
| Delete Account | link → /profile/settings | delete, account, remove |
| Terms of Service | link → /profile/settings | terms, legal |
| Privacy Policy | link → /profile/settings | privacy, legal, policy |

### Search Matching

Settings are filtered by checking if the query matches the label OR any keyword (case-insensitive includes). Full group ordering: **Navigation → Settings → Trips → Commands**.

### Picker Sub-View

When a picker setting is clicked:
1. Palette enters "picker mode" — state: `{ activePickerId: string } | null`
2. Search input is replaced with a back arrow + picker label (e.g., "← Currency")
3. Results area shows the picker's options list, each with the option label and a checkmark if currently selected
4. Clicking an option: calls `onSelect(value)`, exits picker mode, restores previous search
5. Pressing Escape from picker mode: exits picker mode without changing, restores previous search
6. Keyboard navigation (arrow keys + Enter) works the same as the main palette list
7. Typing while in picker mode is disabled — the input is read-only (option lists are short enough that filtering is unnecessary)

### Toggle Rendering

Toggle items render with:
- Label on the left
- Visual on/off indicator on the right (small pill showing "On"/"Off" or a mini toggle graphic)
- Clicking anywhere on the row flips the toggle via `onToggle()`
- Palette stays open after toggling

## Settings Page Rewiring

`apps/web/app/(main)/profile/settings/page.tsx` changes:
- Import `useSettingsStore`
- Replace hardcoded values with store reads
- Replace `() => {}` handlers with store actions
- Account email reads from `useAuthStore` user email
- Account actions (Change Password, Delete Account) remain TODO — out of scope for this feature

## Files Changed

| File | Change |
|------|--------|
| `packages/shared/src/stores/settingsStore.ts` | New — Zustand store |
| `packages/shared/src/index.ts` | Re-export settingsStore |
| `supabase/migrations/YYYYMMDD_add_preferences.sql` | New — add preferences column |
| `apps/web/components/GlobalCommandPalette.tsx` | Add settings items, picker sub-view |
| `apps/web/components/providers.tsx` | Hydrate settings on auth init |
| `apps/web/app/(main)/profile/settings/page.tsx` | Wire to settingsStore |

## Out of Scope

- Change Password flow
- Delete Account flow
- Terms of Service / Privacy Policy URLs (links will navigate to settings page for now)
- Mobile app settings
