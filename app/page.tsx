import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Game, Player, GamePlayer, RSVP } from '@/types';
import HomeClient from './page-client';

export default async function HomePage() {
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

  // Fetch all data in parallel on the server
  const [gamesRes, playersRes, gamePlayersRes, rsvpsRes] = await Promise.all([
    supabase.from('games').select('*').order('date', { ascending: false }),
    supabase.from('players').select('*'),
    supabase.from('game_players').select('*'),
    supabase.from('rsvps').select('*'),
  ]);

  const games: Game[] = gamesRes.data || [];
  const players: Player[] = playersRes.data || [];
  const gamePlayers: GamePlayer[] = gamePlayersRes.data || [];
  const rsvps: RSVP[] = rsvpsRes.data || [];

  return (
    <HomeClient games={games} players={players} gamePlayers={gamePlayers} rsvps={rsvps} />
  );
}
