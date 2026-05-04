import { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { TextStyles } from '@travyl/shared';
import type { AddToTripState } from '@/hooks/useAddToTrip';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  state: AddToTripState;
  onSelectTrip: (id: string) => void;
  onSelectDay: (label: string, index: number) => void;
  onDismiss: () => void;
  onCreateTrip: () => void;
}

export function AddToTripSheet({ state, onSelectTrip, onSelectDay, onDismiss, onCreateTrip }: Props) {
  const insets = useSafeAreaInsets();
  const [addedDay, setAddedDay] = useState<string | null>(null);

  if (!state.visible && !addedDay) return null;
  if (!state.place) return null;

  const handleDaySelect = (label: string, index: number) => {
    setAddedDay(label);
    onSelectDay(label, index);
    setTimeout(() => setAddedDay(null), 2500);
  };

  return (
    <>
      {/* Toast — rendered outside modal so it's always on top */}
      {addedDay && (
        <View style={{
          position: 'absolute', top: insets.top + 10, left: 20, right: 20, zIndex: 9999,
          backgroundColor: '#1e3a5f', borderRadius: 14,
          paddingVertical: 12, paddingHorizontal: 16,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3, shadowRadius: 8,
        }}>
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: 'rgba(100,200,130,0.2)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <FontAwesome name="check" size={12} color="#68d391" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>Added to {addedDay}</Text>
            <Text style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.5)' }} numberOfLines={1}>{state.place?.name}</Text>
          </View>
        </View>
      )}

      <Modal visible={!addedDay} transparent animationType="slide" statusBarTranslucent onRequestClose={onDismiss}>
        {/* Backdrop */}
        <Pressable onPress={onDismiss} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />

        {/* Sheet */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: '#1a1a2e',
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          maxHeight: SCREEN_H * 0.5,
          paddingBottom: insets.bottom + 16,
        }}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TextStyles.title, color: '#fff' }}>
                {state.step === 'pick-trip' ? 'Add to Trip' : 'Pick a Day'}
              </Text>
              <Text style={{ ...TextStyles.bodyLg, color: 'rgba(255,255,255,0.45)', marginTop: 2 }} numberOfLines={1}>
                {state.place.name}
              </Text>
            </View>
            <Pressable onPress={onDismiss} hitSlop={12} style={{
              width: 30, height: 30, borderRadius: 15,
              backgroundColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <FontAwesome name="times" size={12} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>

          <ScrollView style={{ paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
            {/* Trip Picker */}
            {state.step === 'pick-trip' && state.trips.length > 0 && state.trips.map(t => (
              <Pressable key={t.id} onPress={() => onSelectTrip(t.id)}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 13, paddingHorizontal: 14,
                  marginBottom: 6, borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: 'rgba(100,149,237,0.2)',
                    alignItems: 'center', justifyContent: 'center', marginRight: 12,
                  }}>
                    <FontAwesome name="plane" size={14} color="#6495ed" />
                  </View>
                  <Text style={{ ...TextStyles.bodyXlEm, color: '#fff', flex: 1 }}>{t.name}</Text>
                  <FontAwesome name="chevron-right" size={10} color="rgba(255,255,255,0.25)" />
                </View>
              </Pressable>
            ))}

            {/* No Trips */}
            {state.step === 'pick-trip' && state.trips.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <FontAwesome name="suitcase" size={32} color="rgba(255,255,255,0.12)" />
                <Text style={{ ...TextStyles.bodyXl, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>No trips yet</Text>
                <Pressable onPress={onCreateTrip} style={{
                  marginTop: 16, paddingHorizontal: 24, paddingVertical: 10,
                  borderRadius: 20, backgroundColor: '#6495ed',
                }}>
                  <Text style={{ ...TextStyles.button, color: '#fff' }}>Create a Trip</Text>
                </Pressable>
              </View>
            )}

            {/* Day Picker */}
            {state.step === 'pick-day' && state.tripDays.map((day, i) => (
              <Pressable key={i} onPress={() => handleDaySelect(day, i)}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 11, paddingHorizontal: 14,
                  marginBottom: 4, borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                }}>
                  <View style={{
                    width: 34, height: 34, borderRadius: 9,
                    backgroundColor: 'rgba(100,149,237,0.15)',
                    alignItems: 'center', justifyContent: 'center', marginRight: 12,
                  }}>
                    <Text style={{ ...TextStyles.bodyXlEm, color: '#6495ed' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ ...TextStyles.bodyXl, color: '#fff', flex: 1 }}>{day}</Text>
                  <FontAwesome name="plus-circle" size={18} color="rgba(100,149,237,0.5)" />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
