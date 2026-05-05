import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the supabase module
vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

import type { User, Session } from '@supabase/supabase-js';
import { useAuthStore } from './authStore';
import { supabase } from '../services/supabase';

const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>;
const mockSignInWithPassword = supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>;
const mockSignUp = supabase.auth.signUp as ReturnType<typeof vi.fn>;
const mockSignInWithOAuth = supabase.auth.signInWithOAuth as ReturnType<typeof vi.fn>;
const mockSignOut = supabase.auth.signOut as ReturnType<typeof vi.fn>;
const mockUnsubscribe = vi.fn();

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      session: null,
      loading: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initial state', () => {
    it('should start with null user and session', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
    });

    it('should start with loading false', () => {
      const state = useAuthStore.getState();
      expect(state.loading).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should fetch initial session and set loading to false when complete', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' } as User;
      const mockSession = { user: mockUser, access_token: 'token' } as Session;

      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      mockOnAuthStateChange.mockReturnValueOnce({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      useAuthStore.getState().initialize();

      // Wait for the async getSession to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockGetSession).toHaveBeenCalled();
      expect(useAuthStore.getState().session).toEqual(mockSession);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('should handle null session gracefully', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      mockOnAuthStateChange.mockReturnValueOnce({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      useAuthStore.getState().initialize();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('should subscribe to auth state changes', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      mockOnAuthStateChange.mockReturnValueOnce({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      useAuthStore.getState().initialize();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });

    it('should return unsubscribe function', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      mockOnAuthStateChange.mockReturnValueOnce({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const unsubscribe = useAuthStore.getState().initialize();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should update state when auth state changes', async () => {
      const mockUser = { id: 'user-2', email: 'new@example.com' } as User;
      const mockSession = { user: mockUser, access_token: 'new-token' } as Session;

      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      let authStateCallback: ((event: string, session: Session | null) => void) | null = null;
      mockOnAuthStateChange.mockImplementation((callback: any) => {
        authStateCallback = callback;
        return {
          data: { subscription: { unsubscribe: mockUnsubscribe } },
        };
      });

      useAuthStore.getState().initialize();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(authStateCallback).toBeTruthy();
      authStateCallback!('SIGNED_IN', mockSession);

      expect(useAuthStore.getState().session).toEqual(mockSession);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().loading).toBe(false);
    });
  });

  describe('signIn', () => {
    it('should sign in with email and password', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'user-1' } as User },
        error: null,
      });

      await useAuthStore.getState().signIn('test@example.com', 'password123');

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should throw error when sign in fails', async () => {
      const authError = new Error('Invalid credentials');
      mockSignInWithPassword.mockResolvedValueOnce({
        data: null,
        error: authError,
      });

      await expect(
        useAuthStore.getState().signIn('test@example.com', 'wrongpass')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signUp', () => {
    it('should sign up with email and password', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: { id: 'new-user', identities: [{ id: 'identity-1' }] } as unknown as User,
          session: { access_token: 'token' } as Session,
        },
        error: null,
      });

      await useAuthStore.getState().signUp('new@example.com', 'password123');

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: undefined,
      });
    });

    it('should sign up with display name when provided', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: { id: 'new-user', identities: [{ id: 'identity-1' }] } as unknown as User,
          session: { access_token: 'token' } as Session,
        },
        error: null,
      });

      await useAuthStore.getState().signUp('new@example.com', 'password123', 'John Doe');

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: { data: { display_name: 'John Doe' } },
      });
    });

    it('should throw error when account already exists', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: { id: 'existing-user', identities: [] } as unknown as User,
          session: null,
        },
        error: null,
      });

      await expect(
        useAuthStore.getState().signUp('exists@example.com', 'password123')
      ).rejects.toThrow('An account with this email already exists');
    });

    it('should throw error when email confirmation required', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: { id: 'new-user', identities: [{ id: 'identity-1' }] } as unknown as User,
          session: null,
        },
        error: null,
      });

      await expect(
        useAuthStore.getState().signUp('new@example.com', 'password123')
      ).rejects.toThrow('Check your email and click the confirmation link');
    });
  });

  describe('signInWithOAuth', () => {
    it('should sign in with Google OAuth', async () => {
      mockSignInWithOAuth.mockResolvedValueOnce({});

      await useAuthStore.getState().signInWithOAuth('google');

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: undefined,
      });
    });

    it('should sign in with Apple OAuth with redirect', async () => {
      mockSignInWithOAuth.mockResolvedValueOnce({});

      await useAuthStore.getState().signInWithOAuth('apple', '/profile');

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'apple',
        options: { redirectTo: '/profile' },
      });
    });

    it('should support Facebook OAuth', async () => {
      mockSignInWithOAuth.mockResolvedValueOnce({});

      await useAuthStore.getState().signInWithOAuth('facebook');

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'facebook',
        options: undefined,
      });
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockSignOut.mockResolvedValueOnce({ error: null });

      await useAuthStore.getState().signOut();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should throw error when sign out fails', async () => {
      const signOutError = new Error('Sign out failed');
      mockSignOut.mockResolvedValueOnce({ error: signOutError });

      await expect(useAuthStore.getState().signOut()).rejects.toThrow('Sign out failed');
    });
  });
});
