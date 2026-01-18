import { Game, Player, GamePlayer, RSVP } from '@/types';
import HomeClient from './page-client';
import { getServerAuth } from '@/lib/auth-server';
import { createSupabaseServerClient } from '@/lib/auth-helpers';

export default async function HomePage() {
  // Get admin status server-side
  const { isAdmin } = await getServerAuth();
  const supabase = await createSupabaseServerClient();

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
    <HomeClient games={games} players={players} gamePlayers={gamePlayers} rsvps={rsvps} isAdmin={isAdmin} />
  );
}
