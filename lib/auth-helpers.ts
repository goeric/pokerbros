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
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Ignore cookie errors in server actions
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name);
          } catch (error) {
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
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Unauthorized: Please sign in');
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', session.user.id)
    .single();

  if (!adminUser) {
    throw new Error('Unauthorized: Admin access required');
  }

  return session.user;
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
