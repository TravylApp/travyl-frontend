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

const TAB_COLOR_SWATCHES = [
  '#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa',
  '#0891b2', '#06b6d4', '#0ea5e9', '#0284c7',
  '#10b981', '#059669', '#16a34a', '#22c55e',
  '#f59e0b', '#d97706', '#f97316', '#ea580c',
  '#ef4444', '#dc2626', '#e11d48', '#ec4899',
  '#8b5cf6', '#7c3aed', '#6366f1', '#4f46e5',
  '#475569', '#64748b', '#78716c', '#1e3a5f',
];

const DAY_SECTIONS = [
  { key: 'morning', label: 'Morning', icon: 'sun-o' },
  { key: 'afternoon', label: 'Afternoon', icon: 'sun-o' },
  { key: 'evening', label: 'Evening', icon: 'moon-o' },
  { key: 'latenight', label: 'Late Night', icon: 'star' },
] as const;

// Curated swatches for day sections — muted tones that work on light & dark
const DAY_COLOR_SWATCHES = [
  '#3a6b8c', '#4a8db7', '#2d6a4f', '#3a7ca5',
  '#9c7a4f', '#8b6f47', '#b08d57', '#a67c52',
  '#5d4e7a', '#6b5b95', '#7c6b8a', '#8e7cc3',
  '#2d3a4a', '#3d4f5f', '#4a5568', '#374151',
  '#1e3a5f', '#2d4a6f', '#0e7490', '#155e75',
  '#7c2d12', '#9a3412', '#b45309', '#92400e',
  '#4338ca', '#312e81', '#5b21b6', '#6d28d9',
];

export function ThemePicker({
  currentTheme, customColor, onSelect, compact,
  tabColors, tabColorOverrides, onTabColorChange, onResetTabColors,
  itineraryColors, itineraryColorOverrides, onItineraryColorChange, onResetItineraryColors,
}: ThemePickerProps) {
  const [showCustom, setShowCustom] = useState(currentTheme === 'custom');
  const [hexInput, setHexInput] = useState(customColor ?? '#3498db');
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [editingDaySection, setEditingDaySection] = useState<string | null>(null);

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
          onPress={() => {
            setShowCustom(true);
            onSelect('custom', hexInput);
          }}
          style={{ alignItems: 'center', gap: 4 }}
        >
          <View
            style={{
              width: compact ? 36 : 44,
              height: compact ? 36 : 44,
              borderRadius: compact ? 18 : 22,
              borderWidth: currentTheme === 'custom' ? 2.5 : 1.5,
              borderColor: currentTheme === 'custom' ? '#FFC72C' : 'rgba(0,0,0,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
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
            <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: currentTheme === 'custom' ? '600' : '400' }}>
              Custom
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Custom color picker (expanded) */}
      {showCustom && (
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {CUSTOM_SWATCHES.map((color) => (
              <Pressable
                key={color}
                onPress={() => handleCustomColor(color)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: color,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: hexInput === color ? 2 : 0,
                  borderColor: '#fff',
                  shadowColor: hexInput === color ? color : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.4,
                  shadowRadius: 4,
                }}
              >
                {hexInput === color && (
                  <FontAwesome name="check" size={12} color="#fff" />
                )}
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: /^#[0-9a-fA-F]{6}$/.test(hexInput) ? hexInput : '#ccc',
              }}
            />
            <TextInput
              value={hexInput}
              onChangeText={setHexInput}
              onSubmitEditing={handleHexSubmit}
              placeholder="#3498db"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              maxLength={7}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                fontSize: 13,
                color: '#374151',
                fontFamily: 'monospace',
              }}
            />
            <Pressable
              onPress={handleHexSubmit}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: '#1e3a5f',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Apply</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Itinerary Day Colors */}
      {!compact && itineraryColors && onItineraryColorChange && (
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Day Colors</Text>
            {itineraryColorOverrides && Object.keys(itineraryColorOverrides).length > 0 && onResetItineraryColors && (
              <Pressable onPress={onResetItineraryColors} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="undo" size={10} color="#6b7280" />
                <Text style={{ fontSize: 11, color: '#6b7280' }}>Reset</Text>
              </Pressable>
            )}
          </View>
          {/* Day section buttons */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DAY_SECTIONS.map(section => {
              const currentColor = itineraryColorOverrides?.[section.key] ?? itineraryColors[section.key as keyof typeof itineraryColors] ?? '#6b7280';
              const isEditing = editingDaySection === section.key;
              return (
                <Pressable
                  key={section.key}
                  onPress={() => setEditingDaySection(isEditing ? null : section.key)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 10,
                    backgroundColor: isEditing ? currentColor + '15' : '#f3f4f6',
                    borderWidth: isEditing ? 1.5 : 0,
                    borderColor: currentColor,
                  }}
                >
                  <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: currentColor }} />
                  <FontAwesome name={section.icon as any} size={11} color={currentColor} />
                  <Text style={{ fontSize: 11, color: '#374151' }}>{section.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Color picker for selected day section */}
          {editingDaySection && (
            <View style={{ marginTop: 12, padding: 12, backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                {DAY_SECTIONS.find(s => s.key === editingDaySection)?.label ?? editingDaySection} color
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {DAY_COLOR_SWATCHES.map(color => {
                  const isActive = (itineraryColorOverrides?.[editingDaySection] ?? itineraryColors[editingDaySection as keyof typeof itineraryColors]) === color;
                  return (
                    <Pressable
                      key={color}
                      onPress={() => onItineraryColorChange(editingDaySection, color)}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: color,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: isActive ? 2 : 0,
                        borderColor: '#fff',
                        shadowColor: isActive ? color : 'transparent',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4, shadowRadius: 4,
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
      )}

      {/* Per-Tab Colors */}
      {!compact && tabColors && onTabColorChange && (
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Tab Colors</Text>
            {tabColorOverrides && Object.keys(tabColorOverrides).length > 0 && onResetTabColors && (
              <Pressable onPress={onResetTabColors} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="undo" size={10} color="#6b7280" />
                <Text style={{ fontSize: 11, color: '#6b7280' }}>Reset</Text>
              </Pressable>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TAB_LIST.map(tab => {
              const currentColor = tabColorOverrides?.[tab.name] ?? tabColors[tab.name] ?? '#6b7280';
              const isEditing = editingTab === tab.name;
              return (
                <Pressable
                  key={tab.name}
                  onPress={() => setEditingTab(isEditing ? null : tab.name)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 10,
                    backgroundColor: isEditing ? currentColor + '15' : '#f3f4f6',
                    borderWidth: isEditing ? 1.5 : 0,
                    borderColor: currentColor,
                  }}
                >
                  <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: currentColor }} />
                  <FontAwesome name={tab.icon as any} size={11} color={currentColor} />
                  <Text style={{ fontSize: 11, color: '#374151' }}>{tab.title}</Text>
                </Pressable>
              );
            })}
          </View>

          {editingTab && (
            <View style={{ marginTop: 12, padding: 12, backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                {TAB_LIST.find(t => t.name === editingTab)?.title ?? editingTab} color
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {TAB_COLOR_SWATCHES.map(color => {
                  const isActive = (tabColorOverrides?.[editingTab] ?? tabColors[editingTab]) === color;
                  return (
                    <Pressable
                      key={color}
                      onPress={() => onTabColorChange(editingTab, color)}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: color,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: isActive ? 2 : 0,
                        borderColor: '#fff',
                        shadowColor: isActive ? color : 'transparent',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4, shadowRadius: 4,
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
      )}
    </View>
  );
}
