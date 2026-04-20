import { redirect } from 'next/navigation';
import { GamePlayer, Player } from '@/types';
import LiveGameClient from './page-client';
import { getServerAuth } from '@/lib/auth-server';
import { createSupabaseServerClient } from '@/lib/auth-helpers';
import { isGameLive } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface LiveGamePageProps {
  params: Promise<{ id: string }>;
}

export default async function LiveGamePage({ params }: LiveGamePageProps) {
  const { id: gameId } = await params;

  // Get admin status server-side
  const { isAdmin } = await getServerAuth();
  const supabase = await createSupabaseServerClient();

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
  if (!isGameLive(game)) {
    redirect(`/game/${gameId}`);
  }

  // Sync game_players with confirmed RSVPs (adds any new players who RSVP'd)
  // This happens during render, so we don't revalidate (data is fetched fresh below)
  const [rsvpsRes, existingGamePlayersRes] = await Promise.all([
    supabase.from('rsvps').select('*').eq('gameId', gameId).eq('status', 'confirmed'),
    supabase.from('game_players').select('playerId').eq('gameId', gameId),
  ]);

  if (rsvpsRes.error) {
    logger.error('[live-page] Failed to load rsvps for sync', { gameId, error: rsvpsRes.error });
  }
  if (existingGamePlayersRes.error) {
    logger.error('[live-page] Failed to load existing game_players for sync', { gameId, error: existingGamePlayersRes.error });
  }

  // Only attempt sync insert if both sync queries succeeded, to avoid
  // inserting duplicates when we can't see the existing rows.
  if (!rsvpsRes.error && !existingGamePlayersRes.error) {
    const existingPlayerIds = new Set((existingGamePlayersRes.data ?? []).map(gp => gp.playerId));
    const newRsvps = (rsvpsRes.data ?? []).filter(rsvp => !existingPlayerIds.has(rsvp.playerId));

    if (newRsvps.length > 0) {
      const gamePlayersToInsert = newRsvps.map(rsvp => ({
        gameId,
        playerId: rsvp.playerId,
        buyIns: [game.buyIn],
        cashOut: 0,
        profit: 0,
      }));

      const insertRes = await supabase.from('game_players').insert(gamePlayersToInsert);
      if (insertRes.error) {
        logger.error('[live-page] Failed to sync new game_players from rsvps', { gameId, error: insertRes.error });
      }
    }
  }

  // Fetch all data in parallel
  const [gamePlayersRes, playersRes] = await Promise.all([
    supabase.from('game_players').select('*').eq('gameId', gameId),
    supabase.from('players').select('*'),
  ]);

  if (gamePlayersRes.error) {
    logger.error('[live-page] Failed to load game_players', { gameId, error: gamePlayersRes.error });
    throw new Error('Failed to load live game players');
  }
  if (playersRes.error) {
    logger.error('[live-page] Failed to load players', { gameId, error: playersRes.error });
    throw new Error('Failed to load players');
  }

  const gamePlayers: GamePlayer[] = gamePlayersRes.data ?? [];
  const players: Player[] = playersRes.data ?? [];

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
