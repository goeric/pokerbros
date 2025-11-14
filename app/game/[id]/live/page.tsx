import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Game, GamePlayer, Player } from '@/types';
import LiveGameClient from './page-client';
import { getServerAuth } from '@/lib/auth-server';

interface LiveGamePageProps {
  params: Promise<{ id: string }>;
}

export default async function LiveGamePage({ params }: LiveGamePageProps) {
  const { id: gameId } = await params;
  const cookieStore = await cookies();

  // Get admin status server-side
  const { isAdmin } = await getServerAuth();

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

  // Fetch game
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (!game) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400">Game not found</p>
      </div>
    );
  }

  // Check if game should be accessible as live (either explicitly in_progress or past scheduled time)
  const shouldBeLive = () => {
    if (game.status === 'in_progress') return true;
    if (game.status === 'completed') return false;

    const gameDateTime = new Date(`${game.date}T${game.time}`);
    const now = new Date();
    return gameDateTime <= now;
  };

  if (!shouldBeLive()) {
    redirect(`/game/${gameId}`);
  }

  // Sync game_players with confirmed RSVPs (adds any new players who RSVP'd)
  // This happens during render, so we don't revalidate (data is fetched fresh below)
  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('*')
    .eq('gameId', gameId)
    .eq('status', 'confirmed');

  const { data: existingGamePlayers } = await supabase
    .from('game_players')
    .select('*')
    .eq('gameId', gameId);

  // Find RSVPs that don't have game_player entries yet
  const existingPlayerIds = new Set(existingGamePlayers?.map(gp => gp.playerId) || []);
  const newRsvps = (rsvps || []).filter(rsvp => !existingPlayerIds.has(rsvp.playerId));

  // Only insert if there are new players
  if (newRsvps.length > 0) {
    const gamePlayersToInsert = newRsvps.map(rsvp => ({
      gameId,
      playerId: rsvp.playerId,
      buyIns: [game.buyIn],
      cashOut: 0,
      profit: 0,
    }));

    await supabase.from('game_players').insert(gamePlayersToInsert);
  }

  // Fetch all data in parallel
  const [gamePlayersRes, playersRes] = await Promise.all([
    supabase.from('game_players').select('*').eq('gameId', gameId),
    supabase.from('players').select('*'),
  ]);

  const gamePlayers: GamePlayer[] = gamePlayersRes.data || [];
  const players: Player[] = (playersRes.data || []).map(p => ({
    ...p,
    name: `${p.first_name} ${p.last_name}${p.nickname ? ` '${p.nickname}'` : ''}`
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <LiveGameClient
        game={game}
        initialGamePlayers={gamePlayers}
        players={players}
        isAdmin={isAdmin}
      />
    </div>
  );
}
