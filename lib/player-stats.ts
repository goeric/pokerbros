import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

/**
 * Recomputes a player's aggregate lifetime stats from the source of truth:
 * every game_player row that belongs to a *completed* game.
 *
 * This is intentionally a full recompute (not an additive +/- adjustment) so it
 * is idempotent and reversible:
 * - Re-running a finalize can never double-count.
 * - Deleting a completed game (or removing a participant) correctly *lowers*
 *   the player's totals, including biggestWin / biggestLoss, which an additive
 *   running max/min could never recover.
 *
 * The aggregates derive only from completed games because in-progress / upcoming
 * games have no settled profit yet.
 */
export async function recomputePlayerStats(
  supabase: SupabaseClient,
  playerId: string
): Promise<{ error?: string }> {
  // Inner-join games so only completed games contribute to the totals.
  const { data, error } = await supabase
    .from('game_players')
    .select('buyIns, cashOut, profit, games!inner(status)')
    .eq('playerId', playerId)
    .eq('games.status', 'completed');

  if (error) {
    logger.error('[recomputePlayerStats] failed to load completed games', { playerId, error });
    return { error: 'Failed to recompute player stats.' };
  }

  let totalIn = 0;
  let totalOut = 0;
  let gamesPlayed = 0;
  let biggestWin = 0;
  let biggestLoss = 0;

  for (const gp of data ?? []) {
    const buyInSum = (gp.buyIns ?? []).reduce((sum: number, amount: number) => sum + amount, 0);
    const cashOut = gp.cashOut ?? 0;
    const profit = gp.profit ?? 0;

    totalIn += buyInSum;
    totalOut += cashOut;
    gamesPlayed += 1;
    if (profit > biggestWin) biggestWin = profit;
    if (profit < biggestLoss) biggestLoss = profit;
  }

  const { error: updateError } = await supabase
    .from('players')
    .update({ totalIn, totalOut, gamesPlayed, biggestWin, biggestLoss })
    .eq('id', playerId);

  if (updateError) {
    logger.error('[recomputePlayerStats] failed to update player stats', { playerId, error: updateError });
    return { error: 'Failed to update player stats.' };
  }

  return {};
}
