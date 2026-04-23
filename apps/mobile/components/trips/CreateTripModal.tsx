import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, Modal, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Keyboard,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  TextStyles, FontSize, FontFamily, Navy,
  useTripPlanner, savePlanToSupabase,
} from '@travyl/shared';
import { saveAnonTripId } from '@travyl/shared/src/hooks/useTrips';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaperPlane } from '@/components/icons/PaperPlane';

interface CreateTripModalProps {
  visible: boolean;
  onClose: () => void;
  prefillPrompt?: string;
}

const SUGGESTION_CHIPS = [
  '7 days in Rome',
  'Weekend in Bali',
  'Tokyo with friends',
  'Romantic Paris getaway',
  'Budget trip to Thailand',
  'Family vacation Orlando',
];

const PROGRESS_MESSAGES = [
  'Understanding your trip...',
  'Finding the best destinations...',
  'Building your itinerary...',
  'Searching for hotels & flights...',
  'Curating local experiences...',
  'Almost there...',
];

export function CreateTripModal({ visible, onClose, prefillPrompt }: CreateTripModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const planner = useTripPlanner();

  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [progressMsg, setProgressMsg] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Reset on open
  useEffect(() => {
    if (visible) {
      setPrompt(prefillPrompt || '');
      setSaving(false);
      setSubmitted(false);
      setProgressMsg(0);
      setCurrentQuestionIdx(0);
      setAnswers({});
      planner.reset();
    }
  }, [visible]);

  // Dismiss keyboard and clear submitted flag when phase changes
  useEffect(() => {
    if (planner.state.phase !== 'idle') {
      setSubmitted(false);
      inputRef.current?.blur();
      Keyboard.dismiss();
    }
  }, [planner.state.phase]);

  // Cycle progress messages during planning
  useEffect(() => {
    if (planner.state.phase !== 'planning' && planner.state.phase !== 'extracting') return;
    const timer = setInterval(() => {
      setProgressMsg((i) => (i + 1) % PROGRESS_MESSAGES.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [planner.state.phase]);

  // Auto-save when plan completes
  useEffect(() => {
    if (planner.state.phase !== 'complete' || saving) return;
    const plan = planner.state.plan;
    (async () => {
      setSaving(true);
      try {
        const tripId = await savePlanToSupabase(plan as any, () => {});
        await saveAnonTripId(tripId);
        await queryClient.invalidateQueries({ queryKey: ['trips'] });
        // Pre-fetch the trip data so it's cached before we navigate
        await queryClient.prefetchQuery({
          queryKey: ['trip', tripId],
          queryFn: async () => {
            const { data } = await (await import('@travyl/shared')).supabase
              .from('trips').select('*').eq('id', tripId).single();
            return data;
          },
        });
        router.push(`/trip/${tripId}` as never);
        onClose();
      } catch (err) {
        console.error('Save failed:', err);
        setSaving(false);
      }
    })();
  }, [planner.state.phase]);

  const handleSubmit = useCallback(() => {
    const text = prompt.trim();
    if (!text) return;
    inputRef.current?.blur();
    Keyboard.dismiss();
    setSubmitted(true);
    // Short delay so keyboard fully dismisses before phase transition
    setTimeout(() => planner.submitPrompt(text), 250);
  }, [prompt, planner]);

  const handleSelectAnswer = useCallback((questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    // If more questions, advance
    if (planner.state.phase === 'clarifying') {
      const questions = planner.state.questions;
      if (currentQuestionIdx < questions.length - 1) {
        setTimeout(() => setCurrentQuestionIdx((i) => i + 1), 300);
      } else {
        // All answered — submit
        setTimeout(() => planner.submitAnswers(newAnswers), 400);
      }
    }
  }, [answers, currentQuestionIdx, planner]);

  const handleRetry = useCallback(() => {
    planner.reset();
    setCurrentQuestionIdx(0);
    setAnswers({});
  }, [planner]);

  const phase = planner.state.phase;
  // Keep animation visible from the moment they tap submit until navigation completes
  const isWorking = submitted || phase === 'extracting' || phase === 'planning' || phase === 'complete' || saving;
  const isIdle = phase === 'idle' && !submitted && !saving;
  const isClarifying = phase === 'clarifying' && !saving;
  const isError = phase === 'error' && !saving;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, backgroundColor: '#fff' }}>

          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 12,
            borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Navy.DEFAULT, alignItems: 'center', justifyContent: 'center' }}>
                <PaperPlane size={14} color="#fff" style={{ transform: [{ rotate: '-12deg' }] }} />
              </View>
              <Text style={{ ...TextStyles.subhead, fontFamily: FontFamily.sansBold, color: Navy.DEFAULT }}>Plan a Trip</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <FontAwesome name="times" size={18} color="#9ca3af" />
            </Pressable>
          </View>

          {/* ─── Idle: Prompt input ─── */}
          {isIdle && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <Text style={{ ...TextStyles.title, color: Navy.DEFAULT, marginBottom: 4 }}>Where do you want to go?</Text>
              <Text style={{ ...TextStyles.body, color: '#6b7280', marginBottom: 20 }}>
                Describe your dream trip — destination, dates, who's going, what you like.
              </Text>

              <TextInput
                ref={inputRef}
                value={prompt}
                onChangeText={setPrompt}
                placeholder="7 days in Paris with my partner..."
                placeholderTextColor="#9ca3af"
                multiline
                autoFocus
                style={{
                  minHeight: 80, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16,
                  borderWidth: 1.5, borderColor: prompt.trim() ? Navy.DEFAULT : '#e5e7eb',
                  fontSize: FontSize.bodyLg, color: '#111827', fontFamily: FontFamily.sans,
                  textAlignVertical: 'top', backgroundColor: '#f9fafb',
                }}
                onSubmitEditing={handleSubmit}
              />

              {/* Suggestion chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                {SUGGESTION_CHIPS.map((chip) => (
                  <Pressable
                    key={chip}
                    onPress={() => { setPrompt(chip); }}
                    style={({ pressed }) => ({
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: pressed ? '#e0e7ff' : '#f3f4f6',
                    })}
                  >
                    <Text style={{ ...TextStyles.caption, color: '#4b5563' }}>{chip}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Submit button */}
              <Pressable
                onPress={handleSubmit}
                disabled={!prompt.trim()}
                style={({ pressed }) => ({
                  height: 48, borderRadius: 14, backgroundColor: Navy.DEFAULT,
                  alignItems: 'center', justifyContent: 'center', marginTop: 24,
                  opacity: !prompt.trim() ? 0.4 : pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ ...TextStyles.button, color: '#fff' }}>Plan My Trip</Text>
              </Pressable>
            </ScrollView>
          )}

          {/* ─── Working: Progress animation ─── */}
          {isWorking && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <Animated.View entering={FadeIn.duration(300)}>
                <View style={{
                  width: 64, height: 64, borderRadius: 32,
                  backgroundColor: `${Navy.DEFAULT}15`, alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  <PaperPlane size={28} color={Navy.DEFAULT} style={{ transform: [{ rotate: '-12deg' }] }} />
                </View>
              </Animated.View>
              <ActivityIndicator size="small" color={Navy.DEFAULT} style={{ marginBottom: 16 }} />
              <Text style={{ ...TextStyles.bodyLgEm, color: Navy.DEFAULT, textAlign: 'center', marginBottom: 6 }}>
                {saving ? 'Saving your trip...' : PROGRESS_MESSAGES[progressMsg]}
              </Text>
              <Text style={{ ...TextStyles.caption, color: '#9ca3af', textAlign: 'center' }}>
                This usually takes 10–20 seconds
              </Text>
            </View>
          )}

          {/* ─── Clarifying questions ─── */}
          {isClarifying && planner.state.phase === 'clarifying' && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              <Text style={{ ...TextStyles.captionEm, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Question {currentQuestionIdx + 1} of {planner.state.questions.length}
              </Text>

              {(() => {
                const q = planner.state.questions[currentQuestionIdx];
                if (!q) return null;
                return (
                  <Animated.View key={q.id} entering={SlideInDown.duration(300)}>
                    <Text style={{ ...TextStyles.subhead, color: Navy.DEFAULT, marginBottom: 16 }}>{q.question}</Text>
                    <View style={{ gap: 10 }}>
                      {q.options.map((opt) => {
                        const selected = answers[q.id] === opt;
                        return (
                          <Pressable
                            key={opt}
                            onPress={() => handleSelectAnswer(q.id, opt)}
                            style={({ pressed }) => ({
                              paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
                              borderWidth: 1.5,
                              borderColor: selected ? Navy.DEFAULT : '#e5e7eb',
                              backgroundColor: selected ? `${Navy.DEFAULT}10` : pressed ? '#f9fafb' : '#fff',
                            })}
                          >
                            <Text style={{
                              ...TextStyles.bodyLg,
                              color: selected ? Navy.DEFAULT : '#374151',
                              fontFamily: selected ? FontFamily.sansBold : FontFamily.sans,
                            }}>
                              {opt}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Animated.View>
                );
              })()}
            </ScrollView>
          )}

          {/* ─── Error ─── */}
          {isError && planner.state.phase === 'error' && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <View style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                <FontAwesome name="exclamation-circle" size={24} color="#ef4444" />
              </View>
              <Text style={{ ...TextStyles.bodyLgEm, color: '#111827', textAlign: 'center', marginBottom: 6 }}>
                {planner.state.message.includes('400') ? "Couldn't find that destination" : 'Something went wrong'}
              </Text>
              <Text style={{ ...TextStyles.caption, color: '#6b7280', textAlign: 'center', marginBottom: 20, maxWidth: 280 }}>
                {planner.state.message.includes('400')
                  ? 'Try a more specific location — like "Rome, Italy" instead of just "Rome".'
                  : planner.state.message}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={handleRetry}
                  style={({ pressed }) => ({
                    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: Navy.DEFAULT, opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{ ...TextStyles.button, color: '#fff' }}>Try Again</Text>
                </Pressable>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => ({
                    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
                    borderWidth: 1, borderColor: '#e5e7eb', opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{ ...TextStyles.button, color: '#6b7280' }}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
