import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { TextStyles, FontSize, FontFamily, Navy, useAuthStore, supabase } from '@travyl/shared';
import { saveAnonTripId } from '@travyl/shared/src/hooks/useTrips';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaperPlane } from '@/components/icons/PaperPlane';
import { WebView } from 'react-native-webview';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface CreateTripModalProps {
  visible: boolean;
  onClose: () => void;
}

function MiniMap({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const html = `
    <!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>body{margin:0}#map{width:100%;height:100%}</style>
    </head><body><div id="map"></div><script>
    var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lon}],12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(map);
    L.circleMarker([${lat},${lon}],{radius:8,fillColor:'#1e3a5f',fillOpacity:1,color:'#fff',weight:3}).addTo(map)
     .bindPopup('${name.replace(/'/g, "\\'")}').openPopup();
    </script></body></html>`;
  return (
    <WebView
      source={{ html }}
      style={{ flex: 1 }}
      scrollEnabled={false}
      javaScriptEnabled
    />
  );
}

export function CreateTripModal({ visible, onClose }: CreateTripModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDestination('');
      setStartDate(new Date());
      setEndDate(new Date());
      setShowStartPicker(false);
      setShowEndPicker(false);
      setError(null);
      setSubmitting(false);
      setSuggestions([]);
      setSelectedCoords(null);
    }
  }, [visible]);

  // Debounced Nominatim fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = destination.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=4`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [destination]);

  const selectSuggestion = useCallback((s: NominatimResult) => {
    setDestination(s.display_name);
    setSelectedCoords({ lat: parseFloat(s.lat), lon: parseFloat(s.lon), name: s.display_name.split(',')[0] });
    setSuggestions([]);
  }, []);

  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const toISO = (d: Date) => d.toISOString().split('T')[0];

  async function handleSubmit() {
    setError(null);
    if (!title.trim()) { setError('Trip name is required'); return; }
    if (!destination.trim()) { setError('Destination is required'); return; }

    setSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from('trips')
        .insert({
          title: title.trim(),
          destination: destination.trim(),
          start_date: toISO(startDate),
          end_date: toISO(endDate),
          status: 'planning',
          user_id: user?.id ?? null,
        })
        .select()
        .single();

      if (insertError) { setError(insertError.message); return; }

      await saveAnonTripId(data.id);
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      onClose();
      router.push(`/trip/${data.id}` as never);
    } finally {
      setSubmitting(false);
    }
  }

  const mapHeight = screenHeight * 0.3;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>

          {/* Top — map appears only after selecting a destination */}
          <View style={{ height: selectedCoords ? screenHeight * 0.35 : 0, overflow: 'hidden' }}>
            {selectedCoords && (
              <Animated.View
                entering={SlideInUp.duration(400)}
                exiting={SlideOutUp.duration(300)}
                style={{ flex: 1, backgroundColor: '#e5e7eb' }}
              >
                <MiniMap lat={selectedCoords.lat} lon={selectedCoords.lon} name={selectedCoords.name} />
                {/* Destination label */}
                <View style={{
                  position: 'absolute', bottom: 12, left: 16, right: 16,
                  backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10,
                  paddingHorizontal: 12, paddingVertical: 8,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
                }}>
                  <FontAwesome name="map-marker" size={12} color={Navy.DEFAULT} />
                  <Text style={{ ...TextStyles.bodyLgEm, color: Navy.DEFAULT, flex: 1 }} numberOfLines={1}>
                    {selectedCoords.name}
                  </Text>
                </View>
                {/* Close button on map */}
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  style={{
                    position: 'absolute', top: insets.top + 8, right: 16,
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
                    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
                  }}
                >
                  <FontAwesome name="times" size={14} color="#6b7280" />
                </Pressable>
              </Animated.View>
            )}
          </View>

          {/* Bottom card — form */}
          <View style={{
            flex: 1, backgroundColor: '#fff',
            borderTopLeftRadius: selectedCoords ? 20 : 0,
            borderTopRightRadius: selectedCoords ? 20 : 0,
            marginTop: selectedCoords ? -16 : 0,
            shadowColor: '#000', shadowOpacity: selectedCoords ? 0.08 : 0, shadowRadius: 12, shadowOffset: { width: 0, height: -4 },
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: selectedCoords ? 16 : insets.top + 12,
              paddingBottom: 10,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Navy.DEFAULT, alignItems: 'center', justifyContent: 'center' }}>
                  <PaperPlane size={12} color="#fff" style={{ transform: [{ rotate: '-12deg' }] }} />
                </View>
                <Text style={{ ...TextStyles.subhead, fontFamily: FontFamily.sansBold, color: Navy.DEFAULT }}>Plan a Trip</Text>
              </View>
              {!selectedCoords && (
                <Pressable onPress={onClose} hitSlop={12}>
                  <FontAwesome name="times" size={18} color="#9ca3af" />
                </Pressable>
              )}
            </View>

            {/* Form */}
            <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            {error && (
              <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 10 }}>
                <Text style={{ ...TextStyles.caption, color: '#dc2626' }}>{error}</Text>
              </View>
            )}

            {/* Trip name */}
            <View>
              <Text style={{ ...TextStyles.captionEm, color: '#6b7280', marginBottom: 4 }}>Trip name</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Paris Adventure"
                placeholderTextColor="#9ca3af"
                style={{
                  height: 42, paddingHorizontal: 12, borderRadius: 12,
                  borderWidth: 1, borderColor: '#e5e7eb',
                  fontSize: FontSize.bodyLg, color: '#111827', fontFamily: FontFamily.sans,
                }}
              />
            </View>

            {/* Destination */}
            <View>
              <Text style={{ ...TextStyles.captionEm, color: '#6b7280', marginBottom: 4 }}>Destination</Text>
              <TextInput
                value={destination}
                onChangeText={(v) => { setDestination(v); setSelectedCoords(null); }}
                placeholder="e.g. Paris, France"
                placeholderTextColor="#9ca3af"
                autoCorrect={false}
                style={{
                  height: 42, paddingHorizontal: 12, borderRadius: 12,
                  borderWidth: 1, borderColor: '#e5e7eb',
                  fontSize: FontSize.bodyLg, color: '#111827', fontFamily: FontFamily.sans,
                }}
              />
              {suggestions.length > 0 && (
                <View style={{
                  marginTop: 4, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
                  backgroundColor: '#fff', overflow: 'hidden',
                }}>
                  {suggestions.map((s) => (
                    <Pressable
                      key={s.place_id}
                      onPress={() => selectSuggestion(s)}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        paddingHorizontal: 12, paddingVertical: 10,
                        backgroundColor: pressed ? '#f9fafb' : '#fff',
                        borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
                      })}
                    >
                      <FontAwesome name="map-marker" size={12} color="#9ca3af" />
                      <Text style={{ ...TextStyles.body, color: '#374151', flex: 1 }} numberOfLines={1}>{s.display_name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Dates — side by side */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TextStyles.captionEm, color: '#6b7280', marginBottom: 4 }}>Start date</Text>
                <Pressable
                  onPress={() => { setShowStartPicker(!showStartPicker); setShowEndPicker(false); }}
                  style={{
                    height: 42, paddingHorizontal: 12, borderRadius: 12,
                    borderWidth: 1, borderColor: showStartPicker ? Navy.DEFAULT : '#e5e7eb',
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ ...TextStyles.bodyLg, color: '#111827' }}>{formatDate(startDate)}</Text>
                  <FontAwesome name="calendar" size={12} color="#9ca3af" />
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TextStyles.captionEm, color: '#6b7280', marginBottom: 4 }}>End date</Text>
                <Pressable
                  onPress={() => { setShowEndPicker(!showEndPicker); setShowStartPicker(false); }}
                  style={{
                    height: 42, paddingHorizontal: 12, borderRadius: 12,
                    borderWidth: 1, borderColor: showEndPicker ? Navy.DEFAULT : '#e5e7eb',
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ ...TextStyles.bodyLg, color: '#111827' }}>{formatDate(endDate)}</Text>
                  <FontAwesome name="calendar" size={12} color="#9ca3af" />
                </Pressable>
              </View>
            </View>

            {/* Date pickers — inline, toggleable */}
            {showStartPicker && (
              <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="inline"
                  onChange={(_, date) => { if (Platform.OS !== 'ios') setShowStartPicker(false); if (date) setStartDate(date); }}
                />
              </Animated.View>
            )}
            {showEndPicker && (
              <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="inline"
                  minimumDate={startDate}
                  onChange={(_, date) => { if (Platform.OS !== 'ios') setShowEndPicker(false); if (date) setEndDate(date); }}
                />
              </Animated.View>
            )}

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={({ pressed }) => ({
                height: 44, borderRadius: 12, backgroundColor: Navy.DEFAULT,
                alignItems: 'center', justifyContent: 'center',
                opacity: submitting ? 0.5 : pressed ? 0.85 : 1,
              })}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ ...TextStyles.button, color: '#fff' }}>Create Trip</Text>
              )}
            </Pressable>
          </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
