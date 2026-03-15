'use client';

import { useState } from 'react';
import {
  Home, Calendar, Building2, Plane, UtensilsCrossed, Compass,
  Luggage, PieChart, Car, Heart, Settings2, Check, RotateCcw,
  Sun, Moon, Sparkles, Sunset,
  type LucideIcon,
} from 'lucide-react';
import { TRIP_THEMES, THEME_ORDER } from '@travyl/shared';
import type { TripTheme } from '@travyl/shared';

// ─── Config ──────────────────────────────────────────────

const TAB_LIST: { name: string; title: string; icon: LucideIcon }[] = [
  { name: 'index', title: 'Overview', icon: Home },
  { name: 'itinerary', title: 'Itinerary', icon: Calendar },
  { name: 'hotels', title: 'Hotels', icon: Building2 },
  { name: 'flights', title: 'Flights', icon: Plane },
  { name: 'restaurants', title: 'Restaurants', icon: UtensilsCrossed },
  { name: 'activities', title: 'Explore', icon: Compass },
  { name: 'packing', title: 'Packing', icon: Luggage },
  { name: 'budget', title: 'Budget', icon: PieChart },
  { name: 'cars', title: 'Car Rental', icon: Car },
  { name: 'favorites', title: 'Favorites', icon: Heart },
  { name: 'settings', title: 'Settings', icon: Settings2 },
];

const DAY_SECTIONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'morning', label: 'Morning', icon: Sun },
  { key: 'afternoon', label: 'Afternoon', icon: Sunset },
  { key: 'evening', label: 'Evening', icon: Moon },
  { key: 'latenight', label: 'Late Night', icon: Sparkles },
];

const COLOR_SWATCHES = [
  '#1e3a5f', '#2d4a6f', '#0e7490', '#155e75',
  '#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa',
  '#0891b2', '#06b6d4', '#0ea5e9', '#0284c7',
  '#10b981', '#059669', '#16a34a', '#22c55e',
  '#f59e0b', '#d97706', '#f97316', '#ea580c',
  '#ef4444', '#dc2626', '#e11d48', '#ec4899',
  '#8b5cf6', '#7c3aed', '#6366f1', '#4f46e5',
];

const CUSTOM_SWATCHES = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
  '#795548', '#607d8b', '#ff6b6b', '#48dbfb',
  '#ff9ff3', '#feca57', '#54a0ff', '#5f27cd',
];

// ─── Component ───────────────────────────────────────────

interface ThemePickerProps {
  currentTheme: string;
  customColor?: string | null;
  onSelectTheme: (themeId: string, customColor?: string) => void;
  tabColors: Record<string, string>;
  tabColorOverrides: Record<string, string>;
  onTabColorChange: (tabName: string, color: string) => void;
  onResetTabColors: () => void;
  itineraryColors: TripTheme['itineraryColors'];
  itineraryColorOverrides: Record<string, string>;
  onItineraryColorChange: (section: string, color: string) => void;
  onResetItineraryColors: () => void;
}

export function ThemePicker({
  currentTheme,
  customColor,
  onSelectTheme,
  tabColors,
  tabColorOverrides,
  onTabColorChange,
  onResetTabColors,
  itineraryColors,
  itineraryColorOverrides,
  onItineraryColorChange,
  onResetItineraryColors,
}: ThemePickerProps) {
  const [showCustom, setShowCustom] = useState(currentTheme === 'custom');
  const [hexInput, setHexInput] = useState(customColor ?? '#3498db');
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);

  const handleHexSubmit = () => {
    const hex = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onSelectTheme('custom', hex);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Theme Presets ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Trip Theme</h3>
        <div className="flex flex-wrap gap-3">
          {THEME_ORDER.map((id) => {
            const theme = TRIP_THEMES[id]!;
            const isActive = currentTheme === id;
            return (
              <button
                key={id}
                onClick={() => { setShowCustom(false); onSelectTheme(id); }}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: theme.base,
                    border: isActive ? `2.5px solid ${theme.accent}` : '1.5px solid rgba(0,0,0,0.1)',
                    boxShadow: isActive ? `0 0 0 2px ${theme.accent}40` : 'none',
                  }}
                >
                  {isActive && <Check size={14} className="text-white" />}
                </div>
                <span className={`text-[10px] ${isActive ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                  {theme.name}
                </span>
              </button>
            );
          })}
          {/* Custom */}
          <button
            onClick={() => { setShowCustom(true); onSelectTheme('custom', hexInput); }}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className="w-10 h-10 rounded-full overflow-hidden relative flex items-center justify-center"
              style={{
                border: currentTheme === 'custom' ? '2.5px solid #FFC72C' : '1.5px solid rgba(0,0,0,0.1)',
              }}
            >
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                <div style={{ backgroundColor: '#e74c3c' }} />
                <div style={{ backgroundColor: '#3498db' }} />
                <div style={{ backgroundColor: '#2ecc71' }} />
                <div style={{ backgroundColor: '#f1c40f' }} />
              </div>
              {currentTheme === 'custom' && <Check size={14} className="text-white relative z-10" />}
            </div>
            <span className={`text-[10px] ${currentTheme === 'custom' ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
              Custom
            </span>
          </button>
        </div>

        {/* Custom color picker */}
        {showCustom && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex flex-wrap gap-2 mb-3">
              {CUSTOM_SWATCHES.map((color) => (
                <button
                  key={color}
                  onClick={() => { setHexInput(color); onSelectTheme('custom', color); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: color,
                    boxShadow: hexInput === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none',
                  }}
                >
                  {hexInput === color && <Check size={10} className="text-white" />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md shrink-0" style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(hexInput) ? hexInput : '#ccc' }} />
              <input
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleHexSubmit(); }}
                placeholder="#3498db"
                maxLength={7}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
              />
              <button
                onClick={handleHexSubmit}
                className="px-3 py-1.5 bg-[#1e3a5f] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Day Colors ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Day Colors</h3>
          {Object.keys(itineraryColorOverrides).length > 0 && (
            <button onClick={onResetItineraryColors} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition">
              <RotateCcw size={11} />
              Reset
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {DAY_SECTIONS.map(({ key, label, icon: Icon }) => {
            const color = itineraryColorOverrides[key] ?? itineraryColors[key as keyof typeof itineraryColors] ?? '#1e3a5f';
            const isEditing = editingDay === key;
            return (
              <button
                key={key}
                onClick={() => setEditingDay(isEditing ? null : key)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: isEditing ? color + '15' : '#f3f4f6',
                  border: isEditing ? `1.5px solid ${color}` : '1.5px solid transparent',
                }}
              >
                <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                <Icon size={12} style={{ color }} />
                <span className="text-gray-700">{label}</span>
              </button>
            );
          })}
        </div>
        {editingDay && (
          <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              {DAY_SECTIONS.find((s) => s.key === editingDay)?.label} color
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((color) => {
                const isActive = (itineraryColorOverrides[editingDay] ?? itineraryColors[editingDay as keyof typeof itineraryColors]) === color;
                return (
                  <button
                    key={color}
                    onClick={() => onItineraryColorChange(editingDay, color)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: color,
                      boxShadow: isActive ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none',
                    }}
                  >
                    {isActive && <Check size={10} className="text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Tab Colors ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Tab Colors</h3>
          {Object.keys(tabColorOverrides).length > 0 && (
            <button onClick={onResetTabColors} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition">
              <RotateCcw size={11} />
              Reset
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {TAB_LIST.map(({ name, title, icon: Icon }) => {
            const color = tabColorOverrides[name] ?? tabColors[name] ?? '#1e3a5f';
            const isEditing = editingTab === name;
            return (
              <button
                key={name}
                onClick={() => setEditingTab(isEditing ? null : name)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: isEditing ? color + '15' : '#f3f4f6',
                  border: isEditing ? `1.5px solid ${color}` : '1.5px solid transparent',
                }}
              >
                <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                <Icon size={12} style={{ color }} />
                <span className="text-gray-700">{title}</span>
              </button>
            );
          })}
        </div>
        {editingTab && (
          <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              {TAB_LIST.find((t) => t.name === editingTab)?.title} color
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((color) => {
                const isActive = (tabColorOverrides[editingTab] ?? tabColors[editingTab]) === color;
                return (
                  <button
                    key={color}
                    onClick={() => onTabColorChange(editingTab, color)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: color,
                      boxShadow: isActive ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none',
                    }}
                  >
                    {isActive && <Check size={10} className="text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
