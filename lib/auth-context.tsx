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
    try {
      console.log('[Auth] Fetching admin user data for:', userId);

      if (!supabase) {
        setAdminUser(null);
        setLoading(false);
        return;
      }

      // Query the admin_users table to check if this user is actually an admin
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.log('[Auth] User is not an admin:', error.message);
        setAdminUser(null);
      } else {
        console.log('[Auth] User is an admin:', data);
        setAdminUser(data);
      }
    } catch (error) {
      console.error('[Auth] Error fetching admin user:', error);
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
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
