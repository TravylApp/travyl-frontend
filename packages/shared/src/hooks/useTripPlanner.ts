/**
 * @module useTripPlanner
 * Handles the AI-powered trip planning flow — sends natural language input
 * to the backend, receives a structured trip plan, and creates the trip in Supabase.
 * Manages a multi-phase state machine: idle → extracting → clarifying (if needed) →
 * planning → complete (or error at any step).
 * Used by the web homepage search bar and the mobile CreateTripModal.
 */

'use client';

import { useState, useCallback, useRef } from 'react';

// On web: use our own API proxy routes (relative URLs, no prefix needed)
// On mobile: use the web proxy (Next.js API routes for extract/plan), NOT the backend API
const IS_WEB = typeof (globalThis as any).document !== 'undefined' && !process.env.EXPO_PUBLIC_SUPABASE_URL;
const WEB_PROXY = process.env.EXPO_PUBLIC_WEB_API_URL;
const API_URL = IS_WEB ? '' : (WEB_PROXY ?? '');

// Mirrors backend schemas
export interface FollowUpQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface TripExtraction {
  destination: { city: string; country: string; region?: string; lat: number; lng: number };
  dates: { start: string | null; end: string | null; flexible: boolean };
  duration_days: number;
  travelers: { count: number; composition: string; occasion?: string };
  interests: string[];
  budget_level: string | null;
  daily_estimate_usd: number;
  pace: string | null;
  accommodation_type?: string | null; // 'hotel' | 'airbnb' | 'hostel' | 'staying_with_someone' | 'own_place' | null
  [key: string]: unknown;
}

export interface DaySlot {
  poi: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    category: string;
    subcategory: string;
    rating?: number;
    description?: string;
    photo_url?: string;
    visit_duration_min: number;
    tags: string[];
  };
  start_time: string;
  end_time: string;
  start_time_12h: string;
  end_time_12h: string;
  travel_from_prev_min: number;
  directions_url?: string;
}

export interface DayPlan {
  day: number;
  date: string;
  slots: DaySlot[];
  weather?: { date: string; high_c: number; low_c: number; condition: string; icon: string };
}

export interface HotelOption {
  name: string;
  stars: number;
  price_per_night: number;
  currency: string;
  rating?: number;
  review_count?: number;
  photo_url?: string;
  amenities: string[];
  booking_url?: string;
}

export interface FlightOption {
  airline: string;
  departure_time: string;
  arrival_time: string;
  duration_min: number;
  stops: number;
  price: number;
  currency: string;
  booking_url?: string;
}

export interface PlanResponse {
  status: 'complete' | 'needs_clarification';
  extracted: TripExtraction | null;
  questions: FollowUpQuestion[];
  itinerary: DayPlan[];
  hotels: HotelOption[];
  flights: FlightOption[];
  destination_photo_url: string | null;
  timezone: string | null;
}

type PlannerState =
  | { phase: 'idle' }
  | { phase: 'extracting' }
  | { phase: 'clarifying'; questions: FollowUpQuestion[]; extracted: TripExtraction | null }
  | { phase: 'planning' }
  | { phase: 'complete'; plan: PlanResponse }
  | { phase: 'error'; message: string };

/**
 * Lookup table of place names that are geographically ambiguous across
 * countries or regions, used to trigger a clarification question before planning.
 */
// Known ambiguous place names — same name, very different locations
const AMBIGUOUS_PLACES: Record<string, { question: string; options: string[] }> = {
  georgia: { question: 'Which Georgia do you mean?', options: ['Georgia, USA (state)', 'Georgia (country in the Caucasus)'] },
  paris: { question: 'Which Paris do you mean?', options: ['Paris, France', 'Paris, Texas, USA'] },
  portland: { question: 'Which Portland?', options: ['Portland, Oregon, USA', 'Portland, Maine, USA'] },
  cambridge: { question: 'Which Cambridge?', options: ['Cambridge, Massachusetts, USA', 'Cambridge, England, UK'] },
  birmingham: { question: 'Which Birmingham?', options: ['Birmingham, Alabama, USA', 'Birmingham, England, UK'] },
  santiago: { question: 'Which Santiago?', options: ['Santiago, Chile', 'Santiago de Compostela, Spain'] },
  valencia: { question: 'Which Valencia?', options: ['Valencia, Spain', 'Valencia, Venezuela'] },
  tripoli: { question: 'Which Tripoli?', options: ['Tripoli, Libya', 'Tripoli, Lebanon'] },
};

/**
 * Checks whether the user's prompt contains a destination name that maps to
 * multiple distinct real-world locations. Returns a clarification question
 * with options when ambiguity is detected, or null when the destination is clear.
 * @param prompt - The raw natural-language trip request from the user
 * @param extracted - The extraction result from the backend (may already contain a resolved country)
 * @returns A question/options pair to surface in the clarifying UI, or null if unambiguous
 */
function detectAmbiguousDestination(prompt: string, extracted: TripExtraction | null): { question: string; options: string[] } | null {
  // If the extraction already resolved to a specific country, no ambiguity
  if (extracted?.destination?.country) return null;

  const lower = prompt.toLowerCase();
  for (const [name, info] of Object.entries(AMBIGUOUS_PLACES)) {
    // Check if the name appears in the prompt without a country qualifier
    if (lower.includes(name) && !info.options.some(opt => lower.includes(opt.toLowerCase().split(',')[1]?.trim().toLowerCase() || ''))) {
      return info;
    }
  }
  return null;
}

/**
 * Manages the full AI trip-planning conversation flow.
 *
 * Exposes a state machine (`state.phase`) so UIs can show the right step:
 * - `'idle'` — awaiting input
 * - `'extracting'` — parsing the prompt for destinations, dates, travelers
 * - `'clarifying'` — backend needs more info; `state.questions` contains prompts
 * - `'planning'` — generating the full itinerary
 * - `'complete'` — `state.plan` contains the finished `PlanResponse`
 * - `'error'` — `state.message` describes what went wrong
 *
 * @returns Object with:
 *   - `state` — current phase and associated data
 *   - `submitPrompt` — start planning from a natural-language string
 *   - `submitAnswers` — continue after clarification questions are answered
 *   - `reset` — clear all state back to idle
 *
 * @example
 * ```tsx
 * const { state, submitPrompt, submitAnswers, reset } = useTripPlanner();
 *
 * // Start planning
 * await submitPrompt('3 days in Tokyo with a friend, love food and art');
 *
 * // If state.phase === 'clarifying':
 * await submitAnswers({ [state.questions[0].id]: state.questions[0].options[0] });
 *
 * // When state.phase === 'complete':
 * console.log(state.plan.itinerary);
 * ```
 */
export function useTripPlanner() {
  const [state, setState] = useState<PlannerState>({ phase: 'idle' });
  const promptRef = useRef('');
  const contextRef = useRef<{ city?: string; country?: string }>({});

  /**
   * Sends the user's natural-language trip description to `/api/trips/extract`.
   * Advances state to `'extracting'`, then either to `'clarifying'` (if the backend
   * or the local ambiguity check needs more info) or straight to `'planning'`.
   * @param prompt - Free-form description e.g. "5 days in Paris, love museums"
   * @param context - Optional city/country override to help the extractor resolve ambiguity
   */
  const submitPrompt = useCallback(async (prompt: string, context?: { city?: string; country?: string }) => {
    if (API_URL == null) {
      setState({ phase: 'error', message: 'API not configured' });
      return;
    }

    promptRef.current = prompt;
    if (context) contextRef.current = context;
    setState({ phase: 'extracting' });

    try {
      const res = await fetch(`${API_URL}/api/trips/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          city: context?.city ?? contextRef.current.city,
          country: context?.country ?? contextRef.current.country,
        }),
      });

      if (!res.ok) throw new Error(`Extract failed: ${res.status}`);
      const data = await res.json() as PlanResponse;

      // Check for ambiguous destination before proceeding
      const ambiguity = detectAmbiguousDestination(prompt, data.extracted);
      if (ambiguity && !context?.country) {
        setState({
          phase: 'clarifying',
          questions: [{
            id: 'disambiguate_destination',
            question: ambiguity.question,
            options: ambiguity.options,
          }],
          extracted: data.extracted,
        });
        return;
      }

      if (data.status === 'needs_clarification' && data.questions?.length) {
        setState({
          phase: 'clarifying',
          questions: data.questions,
          extracted: data.extracted,
        });
      } else {
        // Extraction complete — go straight to planning
        await runPlan(prompt, {});
      }
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'Extraction failed' });
    }
  }, []);

  /**
   * Submits user responses to follow-up clarification questions, then calls
   * `runPlan` to complete itinerary generation. Handles the special
   * `disambiguate_destination` question by extracting city/country from the answer.
   * @param answers - Map of question ID → selected answer string
   */
  const submitAnswers = useCallback(async (answers: Record<string, string>) => {
    // Handle disambiguation answers — extract city/country from the selected option
    const disambigAnswer = answers['disambiguate_destination'];
    if (disambigAnswer) {
      const parts = disambigAnswer.split(',').map(s => s.trim().replace(/\(.*\)/, '').trim());
      contextRef.current = { city: parts[0], country: parts[parts.length - 1] };
    }
    await runPlan(promptRef.current, answers);
  }, []);

  /**
   * Internal step that calls `/api/trips/plan` with the original prompt, resolved
   * city/country context, and any clarification answers. Transitions state to
   * `'planning'` and then to `'complete'` or another `'clarifying'` round.
   * @param prompt - The original user prompt (preserved from `submitPrompt`)
   * @param answers - Clarification answers collected so far
   */
  const runPlan = async (prompt: string, answers: Record<string, string>) => {
    if (API_URL == null) return;
    setState({ phase: 'planning' });

    try {
      const res = await fetch(`${API_URL}/api/trips/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          city: contextRef.current.city,
          country: contextRef.current.country,
          answers,
        }),
      });

      if (!res.ok) throw new Error(`Plan failed: ${res.status}`);
      const data = await res.json() as PlanResponse;

      if (data.status === 'needs_clarification' && data.questions?.length) {
        setState({
          phase: 'clarifying',
          questions: data.questions,
          extracted: data.extracted,
        });
      } else {
        setState({ phase: 'complete', plan: data });
      }
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'Planning failed' });
    }
  };

  /**
   * Resets the planner back to the `'idle'` phase, clearing the stored prompt
   * and any destination context. Call this after a trip is created or if the
   * user cancels mid-flow.
   */
  const reset = useCallback(() => {
    setState({ phase: 'idle' });
    promptRef.current = '';
    contextRef.current = {};
  }, []);

  return { state, submitPrompt, submitAnswers, reset };
}
