'use client';

import React, { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';

interface AuthContextType {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Simplified AuthProvider - only provides client-side auth actions
 * Auth state is now managed server-side via getServerAuth() in layout.tsx
 * Navigation receives auth state as props, eliminating flash and race conditions
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      router.push('/admin');
      router.refresh(); // Refresh to update server-side auth state
    }

    return { error };
  };

  const signInWithGoogle = async () => {
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
    if (!supabase) return;

    await supabase.auth.signOut();
    router.push('/');
    router.refresh(); // Refresh to update server-side auth state
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
