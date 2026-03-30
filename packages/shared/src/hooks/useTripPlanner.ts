"use client"
import { useState, useCallback, useRef } from 'react';

// On web: use our own API proxy routes (relative URLs, no prefix needed)
// On mobile: use the backend API directly, falling back to web proxy
const IS_WEB = typeof (globalThis as any).document !== 'undefined' && !process.env.EXPO_PUBLIC_SUPABASE_URL;
const BACKEND_API = process.env.EXPO_PUBLIC_RECOMMENDATION_API_URL ?? process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL;
const WEB_PROXY = process.env.EXPO_PUBLIC_WEB_API_URL;
const API_URL = IS_WEB ? '' : (BACKEND_API ?? WEB_PROXY);

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

export function useTripPlanner() {
  const [state, setState] = useState<PlannerState>({ phase: 'idle' });
  const promptRef = useRef('');
  const contextRef = useRef<{ city?: string; country?: string }>({});

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

  const submitAnswers = useCallback(async (answers: Record<string, string>) => {
    await runPlan(promptRef.current, answers);
  }, []);

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

  const reset = useCallback(() => {
    setState({ phase: 'idle' });
    promptRef.current = '';
    contextRef.current = {};
  }, []);

  return { state, submitPrompt, submitAnswers, reset };
}
