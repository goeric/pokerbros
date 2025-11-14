import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { User } from '@supabase/supabase-js';

export interface ServerAuthResult {
  user: User | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

/**
 * Server-side auth helper for App Router
 * Use this in Server Components and Server Actions
 * Returns: { user, isAdmin, isSuperAdmin }
 */
export async function getServerAuth(): Promise<ServerAuthResult> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
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
            // Ignore errors in Server Components (read-only cookies)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name);
          } catch (error) {
            // Ignore errors in Server Components (read-only cookies)
          }
        },
      },
    }
  );

  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { user: null, isAdmin: false, isSuperAdmin: false };
  }

  // Check if user is admin
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return {
    user: session.user,
    isAdmin: !!adminUser,
    isSuperAdmin: adminUser?.is_superadmin ?? false,
  };
}
