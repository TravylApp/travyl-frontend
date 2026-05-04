'use client';

/**
 * @module authStore
 * Zustand store managing Supabase authentication state across web and mobile.
 * Wraps Supabase Auth — tracks the current user, session, and loading state.
 *
 * State shape:
 * - `user`    — Supabase User object or null
 * - `session` — Supabase Session object or null
 * - `loading` — true while fetching the initial session
 *
 * Actions:
 * - `initialize()` — subscribes to auth state changes; must be called once at app root
 * - `signIn(email, password)` — email/password login
 * - `signUp(email, password, name?)` — account creation with optional display name
 * - `signInWithOAuth(provider, redirectTo?)` — OAuth login (Google, Apple, Facebook)
 * - `signOut()` — signs out and clears state
 */

import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialize: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'apple' | 'facebook', redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false, // Start with loading false when Supabase is not configured

  initialize: () => {
    if (!supabase) {
      // Supabase not configured, return no-op unsubscribe
      set({ loading: false });
      return () => {};
    }

    // Set loading true while we fetch the initial session
    set({ loading: true });

    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, loading: false });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
    });

    return () => subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password, name?) => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: name ? { data: { display_name: name } } : undefined,
    });
    if (error) throw error;
    if (data.user?.identities?.length === 0) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
    if (data.user && !data.session) {
      throw new Error('Check your email and click the confirmation link before signing in.');
    }
  },

  signInWithOAuth: async (provider, redirectTo?) => {
    if (!supabase) throw new Error('Supabase is not configured');
    await supabase.auth.signInWithOAuth({
      provider,
      options: redirectTo ? { redirectTo } : undefined,
    });
  },

  signOut: async () => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
}));
