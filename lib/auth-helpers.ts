import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

/**
 * Creates a Supabase server client for use in Server Actions
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Ignore cookie errors in server actions
          }
        },
        remove(name: string, _options: Record<string, unknown>) {
          try {
            cookieStore.delete(name);
          } catch {
            // Ignore cookie errors in server actions
          }
        },
      },
    }
  );
}

/**
 * Requires that the current user is authenticated and is an admin
 * Throws an error if not authorized
 *
 * @returns The authenticated user object
 * @throws Error if not authenticated or not an admin
 */
export async function requireAdmin(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized: Please sign in');
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!adminUser) {
    throw new Error('Unauthorized: Admin access required');
  }

  return user;
}

/**
 * Guards a server action against mutating a completed game.
 * Returns `{ error }` if the game is missing or completed, `{ game }` otherwise.
 */
export async function requireGameNotCompleted(
  supabase: SupabaseClient,
  gameId: string,
  completedMessage = 'This action is not allowed on a completed game.'
): Promise<{ error: string } | { game: { status: string; buyIn: number } }> {
  const { data: game, error } = await supabase
    .from('games')
    .select('status, "buyIn"')
    .eq('id', gameId)
    .single();

  if (error || !game) {
    return handleServerError(error || new Error('Game not found'), 'ERR_GAME_FETCH', 'Game not found.');
  }
  if (game.status === 'completed') {
    return { error: completedMessage };
  }
  return { game };
}

/**
 * Safe error handler that logs detailed errors server-side
 * and returns generic messages to the client
 *
 * @param error The error object
 * @param code Error code for logging/debugging
 * @param userMessage Optional custom message to show user
 * @returns Object with generic error message
 */
export function handleServerError(
  error: unknown,
  code: string,
  userMessage?: string
): { error: string } {
  // Log detailed error server-side (including code)
  logger.error(`[${code}]`, { error, timestamp: new Date().toISOString() });

  // Return generic message to client (no code to avoid information disclosure)
  return {
    error: userMessage || 'An error occurred. Please try again.',
  };
}
