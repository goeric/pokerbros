import { Game, GamePlayer, Player } from '@/types';
import ResultsClient from './page-client';
import { getServerAuth } from '@/lib/auth-server';
import { createSupabaseServerClient } from '@/lib/auth-helpers';

interface ResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id: gameId } = await params;

  // Get admin status server-side
  const { isAdmin } = await getServerAuth();
  const supabase = await createSupabaseServerClient();

  // Fetch all data in parallel
  const [gameRes, gamePlayersRes, playersRes] = await Promise.all([
    supabase.from('games').select('*').eq('id', gameId).single(),
    supabase.from('game_players').select('*').eq('gameId', gameId).order('profit', { ascending: false }),
    supabase.from('players').select('*'),
  ]);

  const game: Game | null = gameRes.data;
  const gamePlayers: GamePlayer[] = gamePlayersRes.data || [];
  const players: Player[] = (playersRes.data || []).map(p => ({
    ...p,
    name: `${p.first_name} ${p.last_name}${p.nickname ? ` '${p.nickname}'` : ''}`
  }));

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400">Game not found</p>
      </div>
    );
  }

  if (game.status !== 'completed') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400">Game not yet completed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ResultsClient
        game={game}
        gamePlayers={gamePlayers}
        players={players}
        isAdmin={isAdmin}
      />
    </div>
  );
}
