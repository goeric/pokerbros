import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Player } from '@/types';
import AdminClient from './components/AdminClient';

// This is a Server Component - it runs on the server and fetches data before rendering
export default async function AdminPage() {
  // Create Supabase server client
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
            // Ignore cookie errors in server components
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name);
          } catch (error) {
            // Ignore cookie errors in server components
          }
        },
      },
    }
  );

  // Fetch players on the server before rendering
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Error fetching players:', error);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AdminClient initialPlayers={players || []} />
    </div>
  );
}
