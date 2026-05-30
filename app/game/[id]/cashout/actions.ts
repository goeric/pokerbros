'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers';
import { CashOutSchema, formatZodError } from '@/lib/validation';
import { recomputePlayerStats } from '@/lib/player-stats';
import { logger } from '@/lib/logger';

export async function finalizeGameResults(gameId: string, cashOuts: Record<string, number>) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check
    await requireAdmin(supabase);

    // ✅ Input validation
    const result = CashOutSchema.safeParse(cashOuts);
    if (!result.success) {
      return formatZodError(result.error);
    }

    const validCashOuts = result.data;

    // Fast guard against re-finalizing an already-completed game. This prevents
    // overwriting a finished game's recorded results with new client values.
    // (The atomic claim below additionally guards the rare concurrent race.)
    const { data: currentGame, error: statusError } = await supabase
      .from('games')
      .select('status')
      .eq('id', gameId)
      .single();

    if (statusError || !currentGame) {
      return handleServerError(statusError || new Error('Game not found'), 'ERR_CASHOUT_STATUS_CHECK', 'Unable to verify game status. Please try again.');
    }

    if (currentGame.status === 'completed') {
      return { error: 'Game has already been finalized.' };
    }

    // Fetch game_players
    const { data: gamePlayers, error: gamePlayersError } = await supabase
      .from('game_players')
      .select('*')
      .eq('gameId', gameId);

    if (gamePlayersError || !gamePlayers) {
      return handleServerError(gamePlayersError || new Error('Game players not found'), 'ERR_CASHOUT_NO_PLAYERS', 'Game players not found.');
    }

    // Validate totals BEFORE mutating anything.
    const totalIn = gamePlayers.reduce(
      (sum, gp) => sum + gp.buyIns.reduce((total: number, buyIn: number) => total + buyIn, 0),
      0
    );
    const totalOut = gamePlayers.reduce((sum, gp) => sum + (validCashOuts[gp.playerId] || 0), 0);
    const difference = totalOut - totalIn;

    if (Math.abs(difference) > 0.01) {
      return {
        error: `Totals don't match! Total in: $${totalIn.toFixed(2)}, Total out: $${totalOut.toFixed(2)}, Difference: $${Math.abs(difference).toFixed(2)}`,
      };
    }

    // Write each player's cash-out and profit. These are absolute (idempotent)
    // writes, so the step is safe to retry until the game is claimed below.
    for (const gamePlayer of gamePlayers) {
      const cashOut = validCashOuts[gamePlayer.playerId] || 0;
      const totalBuyIn = gamePlayer.buyIns.reduce((sum: number, buyIn: number) => sum + buyIn, 0);
      const profit = cashOut - totalBuyIn;

      const { error: updateError } = await supabase
        .from('game_players')
        .update({ cashOut, profit })
        .eq('id', gamePlayer.id);

      if (updateError) {
        return handleServerError(updateError, 'ERR_CASHOUT_UPDATE_PLAYER', 'Failed to record cash-out. Please try again.');
      }
    }

    // Atomically claim finalization: flip to completed only if it is not already
    // completed. A single-row conditional update is atomic, so two concurrent
    // finalizes can never both succeed — eliminating the double-count corruption.
    const { data: claimed, error: claimError } = await supabase
      .from('games')
      .update({ status: 'completed' })
      .eq('id', gameId)
      .neq('status', 'completed')
      .select('id');

    if (claimError) {
      return handleServerError(claimError, 'ERR_CASHOUT_CLAIM', 'Unable to finalize the game. Please try again.');
    }

    if (!claimed || claimed.length === 0) {
      return { error: 'Game has already been finalized.' };
    }

    // Recompute aggregate stats from source for every participant. Idempotent:
    // re-running this can never double-count, and it correctly reflects this
    // game now that it is completed.
    const affectedPlayerIds = [...new Set(gamePlayers.map((gp) => gp.playerId))];
    for (const playerId of affectedPlayerIds) {
      const { error: statError } = await recomputePlayerStats(supabase, playerId);
      if (statError) {
        // The per-game results are already correct; aggregate stats are
        // eventually consistent. Log rather than failing the finalize.
        logger.error('[finalizeGameResults] stat recompute failed', { gameId, playerId, error: statError });
      }
    }

    revalidatePath(`/game/${gameId}`);
    redirect(`/game/${gameId}/results`);
  } catch (error) {
    // Check if it's a redirect (which is expected)
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error; // Re-throw redirects
    }
    return handleServerError(error, 'ERR_CASHOUT_FINALIZE');
  }
}
