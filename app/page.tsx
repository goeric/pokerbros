import { Game, Player, GamePlayer, RSVP } from '@/types';
import HomeClient from './page-client';
import { getServerAuth } from '@/lib/auth-server';
import { createSupabaseServerClient } from '@/lib/auth-helpers';

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  // Auth runs alongside the page data rather than before it - it was previously
  // awaited first, so every request paid an auth round trip before the queries
  // had even started.
  const [{ isAdmin }, gamesRes, playersRes, gamePlayersRes, rsvpsRes] = await Promise.all([
    getServerAuth(),
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
    <HomeClient games={games} players={players} gamePlayers={gamePlayers} rsvps={rsvps} isAdmin={isAdmin} />
  );
}
