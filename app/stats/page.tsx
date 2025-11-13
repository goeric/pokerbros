import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Player } from '@/types';
import StatsClient from './page-client';

export default async function StatsPage() {
  const cookieStore = cookies();

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
            // Ignore
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name);
          } catch (error) {
            // Ignore
          }
        },
      },
    }
  );

  // Fetch all players
  const { data: playersData } = await supabase
    .from('players')
    .select('*');

  const players: Player[] = (playersData || []).map(p => ({
    ...p,
    name: `${p.first_name}${p.nickname ? ` "${p.nickname}"` : ''} ${p.last_name}`.trim()
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <StatsClient players={players} />
    </div>
  );
}
