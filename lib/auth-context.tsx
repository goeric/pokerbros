'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { AdminUser } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  adminUser: AdminUser | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      console.log('[Auth] Supabase not configured');
      setLoading(false);
      return;
    }

    // Get initial session
    console.log('[Auth] Initializing auth context...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[Auth] Initial session:', session ? 'EXISTS' : 'NULL', error);
      setSession(session);
      setUser(session?.user ?? null);

      // Fetch admin user data only if we have a session
      if (session?.user) {
        fetchAdminUser(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth state changed:', event, session ? 'SESSION_EXISTS' : 'NO_SESSION');
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchAdminUser(session.user.id);
      } else {
        setAdminUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  const fetchAdminUser = async (userId: string) => {
    // For admin users, the middleware already validates their admin status
    // We just need to set a placeholder admin user object
    // The actual admin check happens server-side in middleware
    console.log('[Auth] User authenticated, trusting middleware for admin validation');

    // Set a minimal admin user object - actual data comes from middleware
    setAdminUser({
      id: userId,
      email: user?.email || '',
      is_superadmin: false, // Will be determined by middleware
      created_at: new Date().toISOString(),
    } as AdminUser);

    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    console.log('[Auth] Signing in with email:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Sign in error:', error);
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    console.log('[Auth] Initiating Google OAuth...');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('[Auth] Google OAuth error:', error);
    }

    return { error };
  };

  const signOut = async () => {
    if (!supabase) return;

    console.log('[Auth] Signing out...');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAdminUser(null);
  };

  const value = {
    user,
    session,
    adminUser,
    isAdmin: !!adminUser,
    isSuperAdmin: adminUser?.is_superadmin ?? false,
    loading,
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
