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
  signInWithOAuth: (provider: 'google' | 'apple' | 'facebook') => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: () => {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password, name?) => {
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

  signInWithOAuth: async (provider) => {
    await supabase.auth.signInWithOAuth({ provider });
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
}));
