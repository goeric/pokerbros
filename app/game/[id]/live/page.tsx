import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Game, GamePlayer, Player } from '@/types';
import LiveGameClient from './page-client';
import { initializeGamePlayers } from './actions';

interface LiveGamePageProps {
  params: { id: string };
}

export default async function LiveGamePage({ params }: LiveGamePageProps) {
  const gameId = params.id;
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
  await initializeGamePlayers(gameId);

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
      />
    </div>
  );
}
