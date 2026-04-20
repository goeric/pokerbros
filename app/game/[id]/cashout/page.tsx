import { redirect } from 'next/navigation';
import { Game, GamePlayer, Player } from '@/types';
import CashOutClient from './page-client';
import { createSupabaseServerClient } from '@/lib/auth-helpers';
import { getServerAuth } from '@/lib/auth-server';
import { isGameLive } from '@/lib/utils';

interface CashOutPageProps {
  params: Promise<{ id: string }>;
}

export default async function CashOutPage({ params }: CashOutPageProps) {
  const { id: gameId } = await params;

  const { isAdmin } = await getServerAuth();
  if (!isAdmin) {
    redirect('/');
  }

  const supabase = await createSupabaseServerClient();

  // Fetch all data in parallel
  const [gameRes, gamePlayersRes, playersRes] = await Promise.all([
    supabase.from('games').select('*').eq('id', gameId).single(),
    supabase.from('game_players').select('*').eq('gameId', gameId),
    supabase.from('players').select('*'),
  ]);

  const game: Game | null = gameRes.data;
  const gamePlayers: GamePlayer[] = gamePlayersRes.data || [];
  const players: Player[] = playersRes.data || [];

  if (!game || game.status === 'completed' || !isGameLive(game)) {
    redirect(`/game/${gameId}`);
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
