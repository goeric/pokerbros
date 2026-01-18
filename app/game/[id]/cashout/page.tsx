import { Game, GamePlayer, Player } from '@/types';
import CashOutClient from './page-client';
import { createSupabaseServerClient } from '@/lib/auth-helpers';

interface CashOutPageProps {
  params: Promise<{ id: string }>;
}

export default async function CashOutPage({ params }: CashOutPageProps) {
  const { id: gameId } = await params;
  const supabase = await createSupabaseServerClient();

  // Fetch all data in parallel
  const [gameRes, gamePlayersRes, playersRes] = await Promise.all([
    supabase.from('games').select('*').eq('id', gameId).single(),
    supabase.from('game_players').select('*').eq('gameId', gameId),
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CashOutClient
        game={game}
        gamePlayers={gamePlayers}
        players={players}
      />
    </div>
  );
}
