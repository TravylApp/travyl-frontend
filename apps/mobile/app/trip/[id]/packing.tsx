import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Animated, Alert } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useItineraryScreen, TextStyles, FontSize, supabase } from '@travyl/shared';
import type { PackingList } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PageTransition, TabCtx, useTabAccent } from './_layout';

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
      { item: `T-shirts / tops (${Math.min(days + 1, 7)})`, packed: false },
      { item: `Underwear (${Math.min(days + 1, 7)})`, packed: false },
      { item: `Socks (${Math.min(days + 1, 7)} pairs)`, packed: false },
      { item: `Pants / shorts (${Math.min(Math.ceil(days / 2), 4)})`, packed: false },
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

  const defaultList = buildPackingList(trip);
  const [packingList, setPackingList] = useState<PackingList>(defaultList);
  const seeded = useRef(false);

  // Load saved packing list from trip_context if available
  useEffect(() => {
    if (trip && !seeded.current) {
      const saved = (trip.trip_context as any)?.packing_data;
      if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
        setPackingList(saved);
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

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(defaultList)),
  );
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const ACCENT = useTabAccent('packing');
  const colors = useThemeColors();
  const destination = trip?.destination ?? '';

  /* ---- derived counts ---- */
  const allItems = Object.values(packingList).flat();
  const totalItems = allItems.length;
  const packedCount = allItems.filter((i) => i.packed).length;
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

  const addItem = (category: string) => {
    const text = newItemInputs[category]?.trim();
    if (text) {
      updatePacking((prev) => ({
        ...prev,
        [category]: [...prev[category], { item: text, packed: false }],
      }));
      setNewItemInputs((prev) => ({ ...prev, [category]: '' }));
    }
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
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
    >
      {/* ========== Header cards (horizontal scroll) ========== */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 10, paddingVertical: 10 }}
        style={{ marginHorizontal: -16, marginBottom: 18 }}
      >
        {/* Packing Progress */}
        <LinearGradient
          colors={[ACCENT, ACCENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 14, padding: 16, width: 200 }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: 'rgba(255,255,255,0.85)' }}>
              Packing Progress
            </Text>
            <FontAwesome name="suitcase" size={16} color="rgba(255,255,255,0.8)" />
          </View>
          <Text style={{ ...TextStyles.headline, color: '#fff', marginBottom: 8 }}>
            {packedCount} / {totalItems}
          </Text>
          <ProgressBar
            percent={progressPercent}
            height={7}
            trackColor="rgba(255,255,255,0.2)"
            fillColor="#fff"
          />
          <Text style={{ ...TextStyles.body, color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>
            {Math.round(progressPercent)}% packed
          </Text>
        </LinearGradient>

        {/* Weather Info */}
        {trip?.trip_context?.weather?.current && (() => {
          const currentWeather = trip.trip_context.weather!.current!;
          const condition = currentWeather.condition ?? '';
          const weatherIcon = condition.toLowerCase().includes('sun') ? 'sun-o'
            : condition.toLowerCase().includes('rain') ? 'umbrella'
            : condition.toLowerCase().includes('cloud') ? 'cloud' : 'sun-o';
          return (
            <View
              style={{
                borderRadius: 14,
                padding: 16,
                width: 160,
                backgroundColor: ACCENT + '10',
                borderWidth: 1,
                borderColor: ACCENT + '20',
              }}
            >
              <FontAwesome name={weatherIcon} size={20} color={ACCENT} style={{ marginBottom: 6 }} />
              <Text style={{ ...TextStyles.caption, fontWeight: '500', color: colors.textSecondary, marginBottom: 4 }}>
                Weather
              </Text>
              <Text style={{ ...TextStyles.title, color: colors.text, marginBottom: 2 }}>
                {currentWeather.high}°
              </Text>
              <Text style={{ ...TextStyles.body, color: colors.textSecondary, marginBottom: 4 }}>
                Low: {currentWeather.low}°
              </Text>
              <Text style={{ ...TextStyles.caption, color: colors.text, marginBottom: 4 }}>
                {condition}
              </Text>
              <Text style={{ ...TextStyles.sm, color: colors.textTertiary }}>
                {destination}
              </Text>
            </View>
          );
        })()}

        {/* Packing Tips */}
        <View
          style={{
            borderRadius: 14,
            padding: 16,
            width: 200,
            backgroundColor: colors.warningBg,
            borderWidth: 1,
            borderColor: colors.warning,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <FontAwesome name="lightbulb-o" size={14} color="#d97706" />
            <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }}>
              Packing Tips
            </Text>
          </View>
          {['Roll clothes to save space', 'Pack versatile layers', 'Keep essentials in carry-on'].map((tip, i) => (
            <Text key={i} style={{ ...TextStyles.caption, color: colors.warning, marginTop: 4 }}>- {tip}</Text>
          ))}
        </View>
      </ScrollView>

      {/* ========== Packing Categories ========== */}
      <View style={{ gap: 12 }}>
        {Object.entries(packingList).map(([category, items]) => {
          const catPacked = items.filter((i) => i.packed).length;
          const catPercent = items.length > 0 ? (catPacked / items.length) * 100 : 0;
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
                      {catPacked}/{items.length}
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

                  {/* Add Item input */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TextInput
                      value={newItemInputs[category] || ''}
                      onChangeText={(text) =>
                        setNewItemInputs((prev) => ({ ...prev, [category]: text }))
                      }
                      onSubmitEditing={() => addItem(category)}
                      placeholder="New item..."
                      placeholderTextColor={colors.textTertiary}
                      style={{
                        flex: 1,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: FontSize.bodyLg,
                        borderWidth: 1,
                        borderColor: ACCENT + '15',
                        borderRadius: 10,
                        color: colors.text,
                        backgroundColor: colors.surface,
                      }}
                    />
                    <Pressable
                      onPress={() => addItem(category)}
                      style={{
                        backgroundColor: ACCENT,
                        paddingHorizontal: 16,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>Add</Text>
                    </Pressable>
                  </View>
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
            <Text style={{ ...TextStyles.body, color: ACCENT }}>Add a custom packing list</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
    </PageTransition>
  );
}
