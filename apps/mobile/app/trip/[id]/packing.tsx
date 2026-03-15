import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Animated, Alert } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { MOCK_PACKING_LIST, MOCK_WEATHER, MOCK_TRIP } from '@travyl/shared';
import type { PackingList, PackingItem } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PageTransition, useTabAccent } from './_layout';

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

export default function PackingScreen() {
  const [packingList, setPackingList] = useState<PackingList>({ ...MOCK_PACKING_LIST });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(MOCK_PACKING_LIST)),
  );
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const ACCENT = useTabAccent('packing');
  const colors = useThemeColors();
  const trip = MOCK_TRIP;
  const destination = trip.destination ?? MOCK_WEATHER.destination;

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
    setPackingList((prev) => {
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
    setPackingList((prev) => {
      const updated = { ...prev };
      updated[category] = updated[category].filter((_, i) => i !== index);
      return updated;
    });
  };

  const addItem = (category: string) => {
    const text = newItemInputs[category]?.trim();
    if (text) {
      setPackingList((prev) => ({
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
          setPackingList((prev) => {
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
      setPackingList((prev) => ({ ...prev, [newListName.trim()]: [] }));
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
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>
              Packing Progress
            </Text>
            <FontAwesome name="suitcase" size={16} color="rgba(255,255,255,0.8)" />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 8 }}>
            {packedCount} / {totalItems}
          </Text>
          <ProgressBar
            percent={progressPercent}
            height={7}
            trackColor="rgba(255,255,255,0.2)"
            fillColor="#fff"
          />
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>
            {Math.round(progressPercent)}% packed
          </Text>
        </LinearGradient>

        {/* Weather Info */}
        {(() => {
          const weatherIcon = MOCK_WEATHER.conditions.toLowerCase().includes('sun') ? 'sun-o'
            : MOCK_WEATHER.conditions.toLowerCase().includes('rain') ? 'umbrella'
            : MOCK_WEATHER.conditions.toLowerCase().includes('cloud') ? 'cloud' : 'sun-o';
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
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500', marginBottom: 4 }}>
                Weather
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 2 }}>
                {MOCK_WEATHER.high}{MOCK_WEATHER.unit}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                Low: {MOCK_WEATHER.low}{MOCK_WEATHER.unit}
              </Text>
              <Text style={{ fontSize: 11, color: colors.text, marginBottom: 4 }}>
                {MOCK_WEATHER.conditions}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textTertiary }}>
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
            backgroundColor: '#fffbeb',
            borderWidth: 1,
            borderColor: '#fde68a',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <FontAwesome name="lightbulb-o" size={14} color="#d97706" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
              Packing Tips
            </Text>
          </View>
          {['Roll clothes to save space', 'Pack versatile layers', 'Keep essentials in carry-on'].map((tip, i) => (
            <Text key={i} style={{ fontSize: 11, color: '#78350f', marginTop: 4 }}>- {tip}</Text>
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
                  <Text style={{ fontSize: 15, fontWeight: '600', color: ACCENT }}>
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
                    <Text style={{ fontSize: 11, fontWeight: '600', color: ACCENT }}>
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
                  fillColor={catPercent === 100 ? '#22c55e' : ACCENT}
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
                          flex: 1,
                          fontSize: 14,
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
                        fontSize: 13,
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
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Add</Text>
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
              style={{ fontSize: 15, fontWeight: '600', color: ACCENT, marginBottom: 12 }}
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
                fontSize: 14,
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
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Create List</Text>
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
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Cancel</Text>
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
            <Text style={{ fontSize: 14, fontWeight: '600', color: ACCENT }}>
              Create New List
            </Text>
            <Text style={{ fontSize: 12, color: ACCENT }}>Add a custom packing list</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
    </PageTransition>
  );
}
