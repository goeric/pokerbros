'use client';

import React, { createContext, startTransition, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * The Supabase browser client is ~200KB of JS and is needed only to sign in, to
 * sign out, and to watch an existing session for background token refreshes.
 * Importing it at module scope put all of it in the initial bundle of every
 * page, including for signed-out visitors who can never use any of it.
 *
 * Loading it through this helper defers the download until something actually
 * calls it, so it never blocks first paint and signed-out visitors never pay
 * for it at all.
 */
async function getBrowserClient() {
  const { supabase } = await import('./supabase');
  return supabase;
}

/**
 * Simplified AuthProvider - only provides client-side auth actions
 * Auth state is now managed server-side via getServerAuth() in layout.tsx
 * Navigation receives auth state as props, eliminating flash and race conditions
 *
 * `hasSession` comes from the server render. It gates the auth-state
 * subscription, which exists to pick up background token refreshes — something
 * that can only happen when a session already exists.
 */
export function AuthProvider({
  children,
  hasSession = false,
}: {
  children: React.ReactNode;
  hasSession?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!hasSession) return;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    getBrowserClient().then((supabase) => {
      if (!supabase || cancelled) return;

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          startTransition(() => {
            router.refresh();
          });
        }
      });

      unsubscribe = () => subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router, hasSession]);

  const signIn = async (email: string, password: string) => {
    const supabase = await getBrowserClient();
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      startTransition(() => {
        router.replace('/admin');
      });
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    const supabase = await getBrowserClient();
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    // Note: Supabase already implements PKCE (Proof Key for Code Exchange)
    // for OAuth flow security, which is more secure than state parameters.
    // We also rely on server-side origin validation in the callback route.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error };
  };

  const signOut = async () => {
    const supabase = await getBrowserClient();
    if (!supabase) return;

    await supabase.auth.signOut();
    startTransition(() => {
      router.replace('/');
    });
  };

  const value = {
    signIn,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
