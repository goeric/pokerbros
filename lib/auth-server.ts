import { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './auth-helpers';

export type UserRole = 'superadmin' | 'admin' | 'viewer';

export interface ServerAuthResult {
  user: User | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: UserRole | null;
  isViewer: boolean;
  isPlayer: boolean;
  isUnauthorized: boolean;
}

/**
 * Server-side auth helper for App Router
 * Use this in Server Components and Server Actions
 * Returns: { user, isAdmin, isSuperAdmin }
 */
export async function getServerAuth(): Promise<ServerAuthResult> {
  const supabase = await createSupabaseServerClient();

  // Get current user (validates session with auth server)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      isAdmin: false,
      isSuperAdmin: false,
      role: null,
      isViewer: false,
      isPlayer: false,
      isUnauthorized: false,
    };
  }

  // Check if user is admin and get their role
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role, is_superadmin')
    .eq('id', user.id)
    .single();

  const role = adminUser?.role as UserRole | null;

  // Check if user exists as a player
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('email', user.email)
    .single();

  const isPlayer = !!player;
  const hasRole = !!role;

  // User is unauthorized if they're logged in but have no role and are not a player
  const isUnauthorized = !hasRole && !isPlayer;

  return {
    user,
    isAdmin: !!adminUser && (role === 'admin' || role === 'superadmin'),
    isSuperAdmin: role === 'superadmin',
    role,
    isViewer: role === 'viewer',
    isPlayer,
    isUnauthorized,
  };
}
