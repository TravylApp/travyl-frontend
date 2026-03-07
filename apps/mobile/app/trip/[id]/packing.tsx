import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Animated, Alert } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { Navy, MOCK_PACKING_LIST, MOCK_WEATHER, MOCK_TRIP } from '@travyl/shared';
import type { PackingList, PackingItem } from '@travyl/shared';

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
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
    >
      {/* ========== Header cards (stacked on mobile) ========== */}
      <View style={{ gap: 12, marginBottom: 18 }}>
        {/* Packing Progress */}
        <LinearGradient
          colors={[Navy.DEFAULT, Navy.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 14, padding: 16 }}
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
        <View
          style={{
            borderRadius: 14,
            padding: 16,
            backgroundColor: '#eff6ff',
            borderWidth: 1,
            borderColor: '#bfdbfe',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <FontAwesome name="sun-o" size={15} color="#2563eb" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
              {destination} Weather
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 20, marginBottom: 6 }}>
            <Text style={{ fontSize: 13, color: '#374151' }}>
              High: {MOCK_WEATHER.high}
              {MOCK_WEATHER.unit}
            </Text>
            <Text style={{ fontSize: 13, color: '#374151' }}>
              Low: {MOCK_WEATHER.low}
              {MOCK_WEATHER.unit}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>{MOCK_WEATHER.conditions}</Text>
        </View>

        {/* Packing Tips */}
        <View
          style={{
            borderRadius: 14,
            padding: 16,
            backgroundColor: '#fffbeb',
            borderWidth: 1,
            borderColor: '#fde68a',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
            Packing Tips
          </Text>
          <View style={{ gap: 5 }}>
            {[
              'Roll clothes to save space',
              'Pack a change in carry-on',
              'Use packing cubes',
              'Check luggage limits',
            ].map((tip) => (
              <View key={tip} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FontAwesome name="lightbulb-o" size={12} color="#d97706" />
                <Text style={{ fontSize: 12, color: '#374151' }}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

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
                backgroundColor: '#fff',
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                shadowColor: '#000',
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
                  <Text style={{ fontSize: 15, fontWeight: '600', color: Navy.DEFAULT }}>
                    {category}
                  </Text>
                  <FontAwesome
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={10}
                    color="#9ca3af"
                  />
                </Pressable>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      backgroundColor: '#e0f2fe',
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: Navy.DEFAULT }}>
                      {catPacked}/{items.length}
                    </Text>
                  </View>
                  <Pressable onPress={() => deleteCategory(category)} hitSlop={10}>
                    <FontAwesome name="trash-o" size={14} color="#9ca3af" />
                  </Pressable>
                </View>
              </View>

              {/* Per-category progress bar */}
              <View style={{ marginTop: 10 }}>
                <ProgressBar
                  percent={catPercent}
                  height={5}
                  trackColor="#e5e7eb"
                  fillColor={catPercent === 100 ? '#22c55e' : Navy.DEFAULT}
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
                        borderBottomColor: '#f3f4f6',
                      }}
                    >
                      {/* Checkbox */}
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 5,
                          borderWidth: 1.5,
                          borderColor: item.packed ? Navy.DEFAULT : '#d1d5db',
                          backgroundColor: item.packed ? Navy.DEFAULT : 'transparent',
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
                          color: item.packed ? '#9ca3af' : '#111827',
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
                        <FontAwesome name="close" size={12} color="#d1d5db" />
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
                      placeholderTextColor="#9ca3af"
                      style={{
                        flex: 1,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 13,
                        borderWidth: 1,
                        borderColor: '#e0f2fe',
                        borderRadius: 10,
                        color: '#111827',
                        backgroundColor: '#f8fafc',
                      }}
                    />
                    <Pressable
                      onPress={() => addItem(category)}
                      style={{
                        backgroundColor: Navy.DEFAULT,
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
              backgroundColor: '#f0f9ff',
              borderRadius: 14,
              padding: 16,
              borderWidth: 2,
              borderColor: Navy.light,
              borderStyle: 'dashed',
            }}
          >
            <Text
              style={{ fontSize: 15, fontWeight: '600', color: Navy.DEFAULT, marginBottom: 12 }}
            >
              Create New List
            </Text>
            <TextInput
              value={newListName}
              onChangeText={setNewListName}
              onSubmitEditing={createList}
              placeholder="List name (e.g., Beach Gear)"
              placeholderTextColor="#9ca3af"
              autoFocus
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                borderWidth: 1,
                borderColor: Navy.light,
                borderRadius: 10,
                color: '#111827',
                backgroundColor: '#fff',
                marginBottom: 12,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={createList}
                style={{
                  flex: 1,
                  backgroundColor: Navy.DEFAULT,
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
                  backgroundColor: '#e5e7eb',
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Cancel</Text>
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
              borderColor: Navy.light,
              borderStyle: 'dashed',
              backgroundColor: '#f0f9ff',
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
                backgroundColor: '#e0f2fe',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FontAwesome name="plus" size={22} color={Navy.DEFAULT} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: Navy.DEFAULT }}>
              Create New List
            </Text>
            <Text style={{ fontSize: 12, color: Navy.light }}>Add a custom packing list</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
