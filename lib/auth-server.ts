import { cache } from 'react';
import { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from './auth-helpers';

export type UserRole = 'superadmin' | 'admin' | 'viewer';

export interface ServerAuthPlayer {
  id: string;
  avatar: string | null;
  first_name: string;
  last_name: string;
}

export interface ServerAuthResult {
  user: User | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: UserRole | null;
  isViewer: boolean;
  isPlayer: boolean;
  isUnauthorized: boolean;
  /** Profile row for the signed-in user, or null. Saves callers a repeat query. */
  player: ServerAuthPlayer | null;
}

const SIGNED_OUT: ServerAuthResult = {
  user: null,
  isAdmin: false,
  isSuperAdmin: false,
  role: null,
  isViewer: false,
  isPlayer: false,
  isUnauthorized: false,
  player: null,
};

/**
 * Server-side auth helper for App Router
 * Use this in Server Components and Server Actions
 *
 * Wrapped in React `cache()`, which memoizes per request render pass. The root
 * layout and the page both call this on every request; without memoization each
 * request paid for the whole auth lookup twice. Callers see no difference.
 */
export const getServerAuth = cache(async function getServerAuth(): Promise<ServerAuthResult> {
  const supabase = await createSupabaseServerClient();

  // Get current user (validates session with auth server)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return SIGNED_OUT;
  }

  // Independent lookups - run together rather than one after the other.
  const [{ data: adminUser }, { data: player }] = await Promise.all([
    supabase.from('admin_users').select('role, is_superadmin').eq('id', user.id).single(),
    supabase
      .from('players')
      .select('id, avatar, first_name, last_name')
      .eq('email', user.email)
      .single(),
  ]);

  const role = adminUser?.role as UserRole | null;

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
    player: (player as ServerAuthPlayer | null) ?? null,
  };
});
