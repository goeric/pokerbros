'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers';
import { CashOutSchema, formatZodError } from '@/lib/validation';

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

    // Fetch game_players
    const { data: gamePlayers } = await supabase.from('game_players').select('*').eq('gameId', gameId);

    if (!gamePlayers) {
      return handleServerError(new Error('Game players not found'), 'ERR_CASHOUT_NO_PLAYERS', 'Game players not found.');
    }

    // Fetch all players
    const { data: players } = await supabase.from('players').select('*');

    if (!players) {
      return handleServerError(new Error('Players not found'), 'ERR_CASHOUT_NO_PLAYERS_TABLE', 'Players not found.');
    }

    // Validate totals
    const totalIn = gamePlayers.reduce(
      (sum, gp) => sum + gp.buyIns.reduce((total: number, buyIn: number) => total + buyIn, 0),
      0
    );
    const totalOut = Object.values(validCashOuts).reduce((sum, amount) => sum + amount, 0);
    const difference = totalOut - totalIn;

    if (Math.abs(difference) > 0.01) {
      return {
        error: `Totals don't match! Total in: $${totalIn.toFixed(2)}, Total out: $${totalOut.toFixed(2)}, Difference: $${Math.abs(difference).toFixed(2)}`,
      };
    }

    // Update game players with cash-outs and profits
    for (const gamePlayer of gamePlayers) {
      const cashOut = validCashOuts[gamePlayer.playerId] || 0;
      const totalBuyIn = gamePlayer.buyIns.reduce((sum: number, buyIn: number) => sum + buyIn, 0);
      const profit = cashOut - totalBuyIn;

      await supabase.from('game_players').update({ cashOut, profit }).eq('id', gamePlayer.id);

      // Update player stats
      const player = players.find((p) => p.id === gamePlayer.playerId);
      if (player) {
        await supabase
          .from('players')
          .update({
            totalIn: player.totalIn + totalBuyIn,
            totalOut: player.totalOut + cashOut,
            gamesPlayed: player.gamesPlayed + 1,
            biggestWin: Math.max(player.biggestWin, profit > 0 ? profit : 0),
            biggestLoss: Math.min(player.biggestLoss, profit < 0 ? profit : 0),
          })
          .eq('id', gamePlayer.playerId);
      }
    }

    // Update game status
    await supabase.from('games').update({ status: 'completed' }).eq('id', gameId);

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
