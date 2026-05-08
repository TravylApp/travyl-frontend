import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Animated, Alert, Modal, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useItineraryScreen, TextStyles, FontSize, supabase } from '@travyl/shared';
import type { PackingList } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PageTransition, TabCtx, useTabAccent, weatherEmoji } from './_layout';

type TempUnit = 'F' | 'C';
const TEMP_UNIT_KEY = 'weather_temp_unit';
// Detect source unit by scanning every temperature value. The trip context
// has no explicit `units` field today, so we infer from magnitude: any value
// above 50 is almost certainly Fahrenheit (no inhabited place sustains 50°C
// regularly), values consistently at or below 50 are Celsius. Using the max
// of all samples (current high/low + every forecast high/low) makes the call
// robust against a single outlier.
const detectSourceUnit = (samples: Array<number | undefined | null>): TempUnit => {
  let maxSeen = -Infinity;
  for (const s of samples) {
    if (typeof s === 'number' && Number.isFinite(s) && s > maxSeen) maxSeen = s;
  }
  return maxSeen > 50 ? 'F' : 'C';
};
const formatTemp = (
  value: number | string | undefined,
  source: TempUnit,
  display: TempUnit,
) => {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (n == null || Number.isNaN(n)) return '—';
  if (source === display) return `${Math.round(n)}°`;
  const converted = display === 'F' ? n * 9 / 5 + 32 : (n - 32) * 5 / 9;
  return `${Math.round(converted)}°`;
};

/* ------------------------------------------------------------------ */
/*  Animated Progress Bar                                              */
/* ------------------------------------------------------------------ */

function ProgressBar({
  percent,
  height = 6,
  trackColor = 'rgba(88,28,135,0.3)',
  fillColor = '#fff',
}: {
  percent: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: percent,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={{
        backgroundColor: trackColor,
        borderRadius: height / 2,
        height,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          width,
          height: '100%',
          backgroundColor: fillColor,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

function buildPackingList(trip: any): PackingList {
  const days = trip?.start_date && trip?.end_date
    ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
    : 5;
  const forecast = (trip?.trip_context as any)?.weather?.forecast ?? [];
  const avgTemp = forecast.length > 0
    ? forecast.reduce((sum: number, d: any) => sum + (d.high ?? 20), 0) / forecast.length
    : 20;
  const isWarm = avgTemp > 22;
  const isCold = avgTemp < 12;
  const hasRain = forecast.some((d: any) => (d.conditions || d.icon || '').toLowerCase().includes('rain'));

  const list: PackingList = {
    'Essentials': [
      { item: 'Passport / ID', packed: false },
      { item: 'Phone & charger', packed: false },
      { item: 'Wallet & cards', packed: false },
      { item: 'Travel insurance docs', packed: false },
      { item: 'Boarding pass / tickets', packed: false },
    ],
    'Clothing': [
      { item: 'T-shirts / tops', packed: false, quantity: Math.min(days + 1, 7) },
      { item: 'Underwear', packed: false, quantity: Math.min(days + 1, 7) },
      { item: 'Socks (pairs)', packed: false, quantity: Math.min(days + 1, 7) },
      { item: 'Pants / shorts', packed: false, quantity: Math.min(Math.ceil(days / 2), 4) },
      { item: 'Sleepwear', packed: false },
      ...(isWarm ? [{ item: 'Swimsuit', packed: false }, { item: 'Sunglasses', packed: false }] : []),
      ...(isCold ? [{ item: 'Warm jacket', packed: false }, { item: 'Scarf & gloves', packed: false }] : []),
      ...(hasRain ? [{ item: 'Rain jacket / umbrella', packed: false }] : []),
    ],
    'Toiletries': [
      { item: 'Toothbrush & toothpaste', packed: false },
      { item: 'Shampoo & conditioner', packed: false },
      { item: 'Deodorant', packed: false },
      { item: 'Sunscreen', packed: false },
      { item: 'Medications', packed: false },
    ],
    'Electronics': [
      { item: 'Phone charger', packed: false },
      { item: 'Power adapter', packed: false },
      { item: 'Headphones', packed: false },
      { item: 'Camera', packed: false },
    ],
  };
  return list;
}

export default function PackingScreen() {
  const { id: _id } = useLocalSearchParams<{ id: string }>();
  const { tripId: ctxId } = useContext(TabCtx);
  const id = _id || ctxId;
  const { trip } = useItineraryScreen(id);

  // Start empty so the user doesn't see a list built from default trip
  // duration / weather. The effect below populates from trip_context once
  // `trip` loads, or builds defaults from the real trip data.
  const [packingList, setPackingList] = useState<PackingList>({});
  const seeded = useRef(false);

  // Load saved packing list from trip_context if available — otherwise
  // generate defaults from the actual trip (duration + weather).
  useEffect(() => {
    if (trip && !seeded.current) {
      const saved = (trip.trip_context as any)?.packing_data;
      if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
        setPackingList(saved);
      } else {
        setPackingList(buildPackingList(trip));
      }
      seeded.current = true;
    }
  }, [trip]);

  // Debounce-save packing list to trip_context
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistPacking = useCallback((data: PackingList) => {
    if (!seeded.current || !id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase.from('trips').select('trip_context').eq('id', id).single().then(({ data: row }) => {
        if (row) {
          const ctx = (row.trip_context || {}) as Record<string, unknown>;
          ctx.packing_data = data;
          supabase.from('trips').update({ trip_context: ctx }).eq('id', id).then(() => {});
        }
      });
    }, 1500);
  }, [id]);

  const updatePacking = useCallback((updater: PackingList | ((prev: PackingList) => PackingList)) => {
    setPackingList((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persistPacking(next);
      return next;
    });
  }, [persistPacking]);

  // Categories expand to whichever list is currently displayed; recomputed
  // by the effect below once `packingList` populates.
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    setExpandedCategories(new Set(Object.keys(packingList)));
  }, [packingList]);
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});

  // Tap-to-toggle temperature unit, persisted across visits.
  const [tempUnit, setTempUnit] = useState<TempUnit>('F');
  useEffect(() => {
    AsyncStorage.getItem(TEMP_UNIT_KEY).then((v) => {
      if (v === 'C' || v === 'F') setTempUnit(v);
    }).catch(() => {});
  }, []);
  const toggleTempUnit = useCallback(() => {
    setTempUnit((prev) => {
      const next: TempUnit = prev === 'F' ? 'C' : 'F';
      AsyncStorage.setItem(TEMP_UNIT_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  // Tips popup + add-item modal
  const [showTips, setShowTips] = useState(false);
  const [addItemModal, setAddItemModal] = useState<{ category: string } | null>(null);
  const [addItemText, setAddItemText] = useState('');
  const [addItemQty, setAddItemQty] = useState(1);
  const addItemInputRef = useRef<TextInput>(null);

  const openAddItem = (category: string) => {
    setAddItemText('');
    setAddItemQty(1);
    setAddItemModal({ category });
  };
  const closeAddItem = () => {
    Keyboard.dismiss();
    setAddItemModal(null);
  };
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const ACCENT = useTabAccent('packing');
  const colors = useThemeColors();
  const destination = trip?.destination ?? '';

  /* ---- derived counts (weighted by quantity) ---- */
  const allItems = Object.values(packingList).flat();
  const itemQty = (i: { quantity?: number }) => i.quantity ?? 1;
  const totalItems = allItems.reduce((sum, i) => sum + itemQty(i), 0);
  const packedCount = allItems.reduce((sum, i) => sum + (i.packed ? itemQty(i) : 0), 0);
  const progressPercent = totalItems > 0 ? (packedCount / totalItems) * 100 : 0;

  /* ---- mutations ---- */

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleItem = (category: string, index: number) => {
    updatePacking((prev) => {
      const updated = { ...prev };
      updated[category] = [...updated[category]];
      updated[category][index] = {
        ...updated[category][index],
        packed: !updated[category][index].packed,
      };
      return updated;
    });
  };

  const removeItem = (category: string, index: number) => {
    updatePacking((prev) => {
      const updated = { ...prev };
      updated[category] = updated[category].filter((_, i) => i !== index);
      return updated;
    });
  };

  const addItem = (category: string, itemText?: string, quantity?: number) => {
    const text = (itemText ?? newItemInputs[category] ?? '').trim();
    if (!text) return;
    const qty = Math.max(1, quantity ?? 1);
    updatePacking((prev) => ({
      ...prev,
      [category]: [
        ...(prev[category] ?? []),
        { item: text, packed: false, ...(qty > 1 ? { quantity: qty } : {}) },
      ],
    }));
    setNewItemInputs((prev) => ({ ...prev, [category]: '' }));
  };

  const updateQuantity = (category: string, index: number, delta: number) => {
    updatePacking((prev) => {
      const updated = { ...prev };
      const list = [...(updated[category] ?? [])];
      const cur = list[index];
      if (!cur) return prev;
      const nextQty = Math.max(1, (cur.quantity ?? 1) + delta);
      list[index] = { ...cur, quantity: nextQty === 1 ? undefined : nextQty };
      updated[category] = list;
      return updated;
    });
  };

  const submitAddItem = () => {
    if (!addItemModal) return;
    addItem(addItemModal.category, addItemText, addItemQty);
    closeAddItem();
  };

  const deleteCategory = (category: string) => {
    Alert.alert('Delete List', `Delete "${category}" list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          updatePacking((prev) => {
            const updated = { ...prev };
            delete updated[category];
            return updated;
          });
          setExpandedCategories((prev) => {
            const next = new Set(prev);
            next.delete(category);
            return next;
          });
        },
      },
    ]);
  };

  const createList = () => {
    if (newListName.trim()) {
      updatePacking((prev) => ({ ...prev, [newListName.trim()]: [] }));
      setExpandedCategories((prev) => {
        const next = new Set(prev);
        next.add(newListName.trim());
        return next;
      });
      setNewListName('');
      setIsCreatingList(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <PageTransition>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 }}
      stickyHeaderIndices={[0]}
    >
      {/* ========== Sticky Packing Progress ========== */}
      <View style={{ backgroundColor: colors.surface, paddingBottom: 12 }}>
        <LinearGradient
          colors={[ACCENT, ACCENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 14, padding: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FontAwesome name="suitcase" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: 'rgba(255,255,255,0.9)' }}>
                Packing Progress
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ ...TextStyles.bodyLg, fontWeight: '700', color: '#fff' }}>
                {packedCount} / {totalItems}
              </Text>
              <Pressable onPress={() => setShowTips(true)} hitSlop={10} style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' }}>
                <FontAwesome name="lightbulb-o" size={11} color="#fff" />
              </Pressable>
            </View>
          </View>
          <ProgressBar
            percent={progressPercent}
            height={6}
            trackColor="rgba(255,255,255,0.2)"
            fillColor="#fff"
          />
          <Text style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>
            {Math.round(progressPercent)}% packed
          </Text>
        </LinearGradient>
      </View>

      {/* ========== Header cards (non-sticky) ========== */}
      <View style={{ gap: 12, marginBottom: 18 }}>
        {/* Weather — covers every day of the trip; tap to switch °F / °C */}
        {trip?.trip_context?.weather?.current && (() => {
          const currentWeather = trip.trip_context.weather!.current!;
          const condition = (currentWeather as any).condition ?? (currentWeather as any).conditions ?? '';
          const iconKey = (currentWeather as any).icon || condition;
          const forecast: any[] = trip.trip_context.weather?.forecast ?? [];
          const currentTemp = (currentWeather as any).temp ?? currentWeather.high;
          const sourceUnit = detectSourceUnit([
            currentTemp,
            ...forecast.map((d: any) => d?.high),
          ]);
          // Build a slot per trip day from start_date → end_date so the user
          // sees the whole stay even when the API returns fewer points.
          const startMs = trip.start_date ? new Date(trip.start_date).getTime() : NaN;
          const endMs = trip.end_date ? new Date(trip.end_date).getTime() : NaN;
          let dayCells: Array<{ date: string; data: any | null }> = [];
          if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
            const byDate: Record<string, any> = {};
            for (const d of forecast) {
              if (d?.date) byDate[d.date] = d;
            }
            const dayMs = 86400000;
            const totalDays = Math.min(14, Math.round((endMs - startMs) / dayMs) + 1);
            for (let i = 0; i < totalDays; i++) {
              const iso = new Date(startMs + i * dayMs).toISOString().slice(0, 10);
              dayCells.push({ date: iso, data: byDate[iso] ?? null });
            }
          } else {
            dayCells = forecast.slice(0, 7).map((d: any) => ({ date: d?.date ?? '', data: d }));
          }
          return (
            <Pressable
              onPress={toggleTempUnit}
              hitSlop={6}
              style={{
                borderRadius: 14,
                padding: 16,
                backgroundColor: ACCENT + '10',
                borderWidth: 1,
                borderColor: ACCENT + '20',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: dayCells.length > 0 ? 12 : 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 28 }}>{weatherEmoji(iconKey)}</Text>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                      <Text style={{ ...TextStyles.headline, color: colors.text }}>
                        {formatTemp(currentTemp, sourceUnit, tempUnit)}
                      </Text>
                      <Text style={{ ...TextStyles.caption, color: colors.textSecondary, fontWeight: '600' }}>
                        {tempUnit}
                      </Text>
                    </View>
                    <Text style={{ ...TextStyles.caption, color: colors.textSecondary }} numberOfLines={1}>
                      {[condition, destination].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </View>
                <Text style={{ ...TextStyles.caption, color: colors.textTertiary }}>
                  Tap to switch
                </Text>
              </View>
              {dayCells.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 14, paddingTop: 12 }}
                  style={{ borderTopWidth: 1, borderTopColor: ACCENT + '20' }}
                >
                  {dayCells.map((cell, idx) => {
                    const d = cell.data;
                    const dayName = d?.day
                      || (cell.date ? new Date(cell.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }) : '');
                    return (
                      <View key={cell.date || idx} style={{ alignItems: 'center', minWidth: 44 }}>
                        <Text style={{ ...TextStyles.caption, color: colors.textSecondary, marginBottom: 2 }}>{dayName}</Text>
                        <Text style={{ fontSize: 18, marginBottom: 2, opacity: d ? 1 : 0.35 }}>
                          {d ? weatherEmoji(d.icon || d.conditions || '') : '·'}
                        </Text>
                        <Text style={{ ...TextStyles.captionEm, fontWeight: '700', color: d ? colors.text : colors.textTertiary }}>
                          {d ? formatTemp(d.high, sourceUnit, tempUnit) : '—'}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </Pressable>
          );
        })()}

      </View>

      {/* ========== Packing Categories ========== */}
      <View style={{ gap: 12 }}>
        {Object.entries(packingList).map(([category, items]) => {
          const catTotal = items.reduce((sum, i) => sum + itemQty(i), 0);
          const catPacked = items.reduce((sum, i) => sum + (i.packed ? itemQty(i) : 0), 0);
          const catPercent = catTotal > 0 ? (catPacked / catTotal) * 100 : 0;
          const isExpanded = expandedCategories.has(category);

          return (
            <View
              key={category}
              style={{
                backgroundColor: colors.cardBackground,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: colors.shadow,
                shadowOpacity: 0.04,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 1,
              }}
            >
              {/* Category header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Pressable
                  onPress={() => toggleCategory(category)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}
                >
                  <Text style={{ ...TextStyles.bodyXlEm, color: ACCENT }}>
                    {category}
                  </Text>
                  <FontAwesome
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={10}
                    color={colors.textTertiary}
                  />
                </Pressable>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      backgroundColor: ACCENT + '15',
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ ...TextStyles.captionEm, color: ACCENT }}>
                      {catPacked}/{catTotal}
                    </Text>
                  </View>
                  <Pressable onPress={() => deleteCategory(category)} hitSlop={10}>
                    <FontAwesome name="trash-o" size={14} color={colors.textTertiary} />
                  </Pressable>
                </View>
              </View>

              {/* Per-category progress bar */}
              <View style={{ marginTop: 10 }}>
                <ProgressBar
                  percent={catPercent}
                  height={5}
                  trackColor={colors.border}
                  fillColor={catPercent === 100 ? colors.success : ACCENT}
                />
              </View>

              {/* Expanded items */}
              {isExpanded && (
                <View style={{ marginTop: 12 }}>
                  {items.map((item, index) => (
                    <Pressable
                      key={`${category}-${index}-${item.item}`}
                      onPress={() => toggleItem(category, index)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 10,
                        borderBottomWidth: index < items.length - 1 ? 1 : 0,
                        borderBottomColor: colors.borderLight,
                      }}
                    >
                      {/* Checkbox */}
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 5,
                          borderWidth: 1.5,
                          borderColor: item.packed ? ACCENT : colors.border,
                          backgroundColor: item.packed ? ACCENT : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {item.packed && <FontAwesome name="check" size={10} color="#fff" />}
                      </View>

                      {/* Item name */}
                      <Text
                        style={{
                          ...TextStyles.bodyXl,
                          flex: 1,
                          color: item.packed ? colors.textTertiary : colors.text,
                          textDecorationLine: item.packed ? 'line-through' : 'none',
                        }}
                      >
                        {item.item}
                      </Text>

                      {/* Quantity stepper (defaults to 1, hidden until incremented) */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Pressable
                          onPress={() => updateQuantity(category, index, -1)}
                          hitSlop={8}
                          style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <FontAwesome name="minus" size={9} color={colors.textSecondary} />
                        </Pressable>
                        <Text style={{ ...TextStyles.body, fontWeight: '600', color: colors.text, minWidth: 18, textAlign: 'center' }}>
                          {item.quantity ?? 1}
                        </Text>
                        <Pressable
                          onPress={() => updateQuantity(category, index, 1)}
                          hitSlop={8}
                          style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <FontAwesome name="plus" size={9} color={colors.textSecondary} />
                        </Pressable>
                      </View>

                      {/* Delete item */}
                      <Pressable
                        onPress={() => removeItem(category, index)}
                        hitSlop={10}
                        style={{ padding: 4 }}
                      >
                        <FontAwesome name="close" size={12} color={colors.border} />
                      </Pressable>
                    </Pressable>
                  ))}

                  {/* Add Item — opens a modal so the keyboard + input are always visible */}
                  <Pressable
                    onPress={() => openAddItem(category)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      marginTop: 10,
                      paddingVertical: 11,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: ACCENT + '40',
                      backgroundColor: ACCENT + '08',
                    }}
                  >
                    <FontAwesome name="plus" size={11} color={ACCENT} />
                    <Text style={{ ...TextStyles.bodyEm, color: ACCENT, fontWeight: '600' }}>
                      Add Item
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        {/* ========== Create New List ========== */}
        {isCreatingList ? (
          <View
            style={{
              backgroundColor: ACCENT + '08',
              borderRadius: 14,
              padding: 16,
              borderWidth: 2,
              borderColor: ACCENT,
              borderStyle: 'dashed',
            }}
          >
            <Text
              style={{ ...TextStyles.bodyXlEm, color: ACCENT, marginBottom: 12 }}
            >
              Create New List
            </Text>
            <TextInput
              value={newListName}
              onChangeText={setNewListName}
              onSubmitEditing={createList}
              placeholder="List name (e.g., Beach Gear)"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: FontSize.bodyXl,
                borderWidth: 1,
                borderColor: ACCENT,
                borderRadius: 10,
                color: colors.text,
                backgroundColor: colors.cardBackground,
                marginBottom: 12,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={createList}
                style={{
                  flex: 1,
                  backgroundColor: ACCENT,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>Create List</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setNewListName('');
                  setIsCreatingList(false);
                }}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  backgroundColor: colors.border,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...TextStyles.bodyXlEm, color: colors.text }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setIsCreatingList(true)}
            style={{
              borderRadius: 14,
              padding: 28,
              borderWidth: 2,
              borderColor: ACCENT,
              borderStyle: 'dashed',
              backgroundColor: ACCENT + '08',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: ACCENT + '15',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FontAwesome name="plus" size={22} color={ACCENT} />
            </View>
            <Text style={{ ...TextStyles.bodyXlEm, color: ACCENT }}>
              Create New List
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>

    {/* ── Packing Tips popup ───────────────────────────────── */}
    <Modal visible={showTips} transparent animationType="fade" onRequestClose={() => setShowTips(false)}>
      <Pressable
        onPress={() => setShowTips(false)}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FontAwesome name="lightbulb-o" size={16} color={ACCENT} />
              <Text style={{ ...TextStyles.title, color: colors.text }}>Packing Tips</Text>
            </View>
            <Pressable onPress={() => setShowTips(false)} hitSlop={12}>
              <FontAwesome name="times" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
          {[
            'Roll clothes instead of folding to save 30% space.',
            'Pack versatile layers — a light jacket works in most climates.',
            'Keep a full set of essentials (meds, charger, IDs) in your carry-on.',
            'Use packing cubes to separate clean and dirty laundry.',
            'Photograph your luggage in case it gets lost.',
          ].map((tip, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Text style={{ ...TextStyles.body, color: ACCENT, fontWeight: '700' }}>{i + 1}.</Text>
              <Text style={{ ...TextStyles.body, color: colors.text, flex: 1, lineHeight: 20 }}>{tip}</Text>
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>

    {/* ── Add Item modal ───────────────────────────────────── */}
    <Modal visible={addItemModal !== null} transparent animationType="fade" onRequestClose={closeAddItem}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          onPress={closeAddItem}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 20 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ ...TextStyles.title, color: colors.text }}>
                Add to {addItemModal?.category}
              </Text>
              <Pressable onPress={closeAddItem} hitSlop={12}>
                <FontAwesome name="times" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
            <TextInput
              ref={addItemInputRef}
              value={addItemText}
              onChangeText={setAddItemText}
              placeholder="What do you need?"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={submitAddItem}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: FontSize.bodyXl,
                borderWidth: 1,
                borderColor: ACCENT + '30',
                borderRadius: 10,
                color: colors.text,
                backgroundColor: colors.surface,
                marginBottom: 14,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>Quantity</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  onPress={() => setAddItemQty((q) => Math.max(1, q - 1))}
                  hitSlop={8}
                  style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <FontAwesome name="minus" size={11} color={colors.textSecondary} />
                </Pressable>
                <Text style={{ ...TextStyles.title, color: colors.text, minWidth: 28, textAlign: 'center' }}>
                  {addItemQty}
                </Text>
                <Pressable
                  onPress={() => setAddItemQty((q) => q + 1)}
                  hitSlop={8}
                  style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <FontAwesome name="plus" size={11} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            <Pressable
              onPress={submitAddItem}
              disabled={!addItemText.trim()}
              style={{
                backgroundColor: addItemText.trim() ? ACCENT : colors.border,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>
                Add {addItemQty > 1 ? `× ${addItemQty}` : ''}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
    </PageTransition>
  );
}
