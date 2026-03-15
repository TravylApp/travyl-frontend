import { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { TRIP_THEMES, THEME_ORDER } from '@travyl/shared';
import type { TripTheme } from '@travyl/shared';

interface ThemePickerProps {
  currentTheme: string;
  customColor?: string | null;
  onSelect: (themeId: string, customColor?: string) => void;
  compact?: boolean;
  // Per-tab customization
  tabColors?: Record<string, string>;
  tabColorOverrides?: Record<string, string>;
  onTabColorChange?: (tabName: string, color: string) => void;
  onResetTabColors?: () => void;
  // Itinerary day color customization
  itineraryColors?: TripTheme['itineraryColors'];
  itineraryColorOverrides?: Record<string, string>;
  onItineraryColorChange?: (section: string, color: string) => void;
  onResetItineraryColors?: () => void;
}

const CUSTOM_SWATCHES = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
  '#795548', '#607d8b', '#ff6b6b', '#48dbfb',
  '#ff9ff3', '#feca57', '#54a0ff', '#5f27cd',
];

const COLOR_SWATCHES = [
  '#1e3a5f', '#2d4a6f', '#3b82f6', '#2563eb',
  '#0e7490', '#0891b2', '#06b6d4', '#0ea5e9',
  '#10b981', '#059669', '#16a34a', '#15803d',
  '#f59e0b', '#d97706', '#f97316', '#ea580c',
  '#ef4444', '#dc2626', '#e11d48', '#ec4899',
  '#8b5cf6', '#7c3aed', '#6366f1', '#4f46e5',
  '#312e81', '#5b21b6', '#9a3412', '#475569',
];

const TAB_LIST = [
  { name: 'index', title: 'Overview', icon: 'home' },
  { name: 'itinerary', title: 'Itinerary', icon: 'calendar' },
  { name: 'hotels', title: 'Hotels', icon: 'building-o' },
  { name: 'flights', title: 'Flights', icon: 'plane' },
  { name: 'restaurants', title: 'Restaurants', icon: 'cutlery' },
  { name: 'activities', title: 'Explore', icon: 'compass' },
  { name: 'packing', title: 'Packing', icon: 'suitcase' },
  { name: 'budget', title: 'Budget', icon: 'pie-chart' },
  { name: 'cars', title: 'Car Rental', icon: 'car' },
  { name: 'favorites', title: 'Favorites', icon: 'heart' },
  { name: 'settings', title: 'Settings', icon: 'cog' },
];

const DAY_SECTIONS = [
  { key: 'morning', label: 'Morning', icon: 'sun-o' },
  { key: 'afternoon', label: 'Afternoon', icon: 'sun-o' },
  { key: 'evening', label: 'Evening', icon: 'moon-o' },
  { key: 'latenight', label: 'Late Night', icon: 'star' },
] as const;

export function ThemePicker({
  currentTheme, customColor, onSelect, compact,
  tabColors, tabColorOverrides, onTabColorChange, onResetTabColors,
  itineraryColors, itineraryColorOverrides, onItineraryColorChange, onResetItineraryColors,
}: ThemePickerProps) {
  const [showCustom, setShowCustom] = useState(currentTheme === 'custom');
  const [hexInput, setHexInput] = useState(customColor ?? '#3498db');
  const [editing, setEditing] = useState<{ type: 'tab' | 'day'; key: string } | null>(null);

  const handlePresetSelect = (themeId: string) => {
    setShowCustom(false);
    onSelect(themeId);
  };

  const handleCustomColor = (color: string) => {
    setHexInput(color);
    onSelect('custom', color);
  };

  const handleHexSubmit = () => {
    const hex = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onSelect('custom', hex);
    }
  };

  const editingLabel = editing
    ? editing.type === 'tab'
      ? TAB_LIST.find((t) => t.name === editing.key)?.title
      : DAY_SECTIONS.find((s) => s.key === editing.key)?.label
    : null;

  const editingCurrentColor = editing
    ? editing.type === 'tab'
      ? tabColorOverrides?.[editing.key] ?? tabColors?.[editing.key] ?? '#6b7280'
      : itineraryColorOverrides?.[editing.key] ?? itineraryColors?.[editing.key as keyof typeof itineraryColors] ?? '#6b7280'
    : null;

  return (
    <View>
      {/* Preset themes */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: compact ? 8 : 12, paddingVertical: 4 }}
      >
        {THEME_ORDER.map((id) => {
          const theme = TRIP_THEMES[id]!;
          const isActive = currentTheme === id;
          return (
            <Pressable
              key={id}
              onPress={() => handlePresetSelect(id)}
              style={{ alignItems: 'center', gap: 4 }}
            >
              <View
                style={{
                  width: compact ? 36 : 44,
                  height: compact ? 36 : 44,
                  borderRadius: compact ? 18 : 22,
                  backgroundColor: theme.base,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: isActive ? 2.5 : 1.5,
                  borderColor: isActive ? theme.accent : 'rgba(0,0,0,0.1)',
                }}
              >
                {isActive && (
                  <FontAwesome name="check" size={compact ? 12 : 16} color={theme.textOnBase} />
                )}
              </View>
              {!compact && (
                <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: isActive ? '600' : '400' }}>
                  {theme.name}
                </Text>
              )}
            </Pressable>
          );
        })}

        {/* Custom option */}
        <Pressable
          onPress={() => { setShowCustom(true); onSelect('custom', hexInput); }}
          style={{ alignItems: 'center', gap: 4 }}
        >
          <View
            style={{
              width: compact ? 36 : 44, height: compact ? 36 : 44,
              borderRadius: compact ? 18 : 22,
              borderWidth: currentTheme === 'custom' ? 2.5 : 1.5,
              borderColor: currentTheme === 'custom' ? '#FFC72C' : 'rgba(0,0,0,0.1)',
              alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}
          >
            <View style={{ position: 'absolute', top: 0, left: 0, right: '50%', bottom: '50%', backgroundColor: '#e74c3c' }} />
            <View style={{ position: 'absolute', top: 0, left: '50%', right: 0, bottom: '50%', backgroundColor: '#3498db' }} />
            <View style={{ position: 'absolute', top: '50%', left: 0, right: '50%', bottom: 0, backgroundColor: '#2ecc71' }} />
            <View style={{ position: 'absolute', top: '50%', left: '50%', right: 0, bottom: 0, backgroundColor: '#f1c40f' }} />
            {currentTheme === 'custom' && (
              <FontAwesome name="check" size={compact ? 12 : 16} color="#fff" style={{ zIndex: 1 }} />
            )}
          </View>
          {!compact && (
            <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: currentTheme === 'custom' ? '600' : '400' }}>Custom</Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Custom color picker */}
      {showCustom && (
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {CUSTOM_SWATCHES.map((color) => (
              <Pressable
                key={color}
                onPress={() => handleCustomColor(color)}
                style={{
                  width: 32, height: 32, borderRadius: 8, backgroundColor: color,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: hexInput === color ? 2 : 0, borderColor: '#fff',
                  shadowColor: hexInput === color ? color : 'transparent',
                  shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4,
                }}
              >
                {hexInput === color && <FontAwesome name="check" size={12} color="#fff" />}
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: /^#[0-9a-fA-F]{6}$/.test(hexInput) ? hexInput : '#ccc' }} />
            <TextInput
              value={hexInput} onChangeText={setHexInput} onSubmitEditing={handleHexSubmit}
              placeholder="#3498db" placeholderTextColor="#9ca3af" autoCapitalize="none" maxLength={7}
              style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#374151', fontFamily: 'monospace' }}
            />
            <Pressable onPress={handleHexSubmit} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1e3a5f' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Apply</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Day Colors — tap to select, shared color picker below ── */}
      {!compact && itineraryColors && onItineraryColorChange && (
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Day Colors</Text>
            {itineraryColorOverrides && Object.keys(itineraryColorOverrides).length > 0 && onResetItineraryColors && (
              <Pressable onPress={onResetItineraryColors} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="undo" size={10} color="#6b7280" />
                <Text style={{ fontSize: 11, color: '#6b7280' }}>Reset</Text>
              </Pressable>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {DAY_SECTIONS.map((section) => {
              const color = itineraryColorOverrides?.[section.key] ?? itineraryColors[section.key as keyof typeof itineraryColors] ?? '#6b7280';
              const isEditing = editing?.type === 'day' && editing.key === section.key;
              return (
                <Pressable
                  key={section.key}
                  onPress={() => setEditing(isEditing ? null : { type: 'day', key: section.key })}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                    backgroundColor: isEditing ? color + '15' : '#f3f4f6',
                    borderWidth: isEditing ? 1.5 : 0, borderColor: color,
                  }}
                >
                  <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: color }} />
                  <FontAwesome name={section.icon as any} size={10} color={color} />
                  <Text style={{ fontSize: 11, color: '#374151' }}>{section.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Tab Colors — tap to select, shared color picker below ── */}
      {!compact && tabColors && onTabColorChange && (
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Tab Colors</Text>
            {tabColorOverrides && Object.keys(tabColorOverrides).length > 0 && onResetTabColors && (
              <Pressable onPress={onResetTabColors} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="undo" size={10} color="#6b7280" />
                <Text style={{ fontSize: 11, color: '#6b7280' }}>Reset</Text>
              </Pressable>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {TAB_LIST.map((tab) => {
              const color = tabColorOverrides?.[tab.name] ?? tabColors[tab.name] ?? '#6b7280';
              const isEditing = editing?.type === 'tab' && editing.key === tab.name;
              return (
                <Pressable
                  key={tab.name}
                  onPress={() => setEditing(isEditing ? null : { type: 'tab', key: tab.name })}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                    backgroundColor: isEditing ? color + '15' : '#f3f4f6',
                    borderWidth: isEditing ? 1.5 : 0, borderColor: color,
                  }}
                >
                  <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: color }} />
                  <FontAwesome name={tab.icon as any} size={10} color={color} />
                  <Text style={{ fontSize: 11, color: '#374151' }}>{tab.title}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Shared color picker — shows when editing any day or tab ── */}
      {editing && (
        <View style={{ marginTop: 12, padding: 12, backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
            {editingLabel} color
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {COLOR_SWATCHES.map((color) => {
              const isActive = editingCurrentColor === color;
              return (
                <Pressable
                  key={color}
                  onPress={() => {
                    if (editing.type === 'tab' && onTabColorChange) {
                      onTabColorChange(editing.key, color);
                    } else if (editing.type === 'day' && onItineraryColorChange) {
                      onItineraryColorChange(editing.key, color);
                    }
                  }}
                  style={{
                    width: 32, height: 32, borderRadius: 8, backgroundColor: color,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: isActive ? 2 : 0, borderColor: '#fff',
                    shadowColor: isActive ? color : 'transparent',
                    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4,
                  }}
                >
                  {isActive && <FontAwesome name="check" size={12} color="#fff" />}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
