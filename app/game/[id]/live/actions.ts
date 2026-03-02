'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers';
import { RebuySchema, EarlyCashOutSchema, formatZodError } from '@/lib/validation';
import { calculateTotalBuyIn } from '@/lib/utils';

export async function addRebuy(gameId: string, gamePlayerId: string, buyInAmount: number) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check
    await requireAdmin(supabase);

    // ✅ Input validation
    const result = RebuySchema.safeParse({ gameId, gamePlayerId, buyInAmount });
    if (!result.success) {
      return formatZodError(result.error);
    }

    // Get current buy-ins
    const { data: gamePlayer } = await supabase
      .from('game_players')
      .select('buyIns')
      .eq('id', gamePlayerId)
      .single();

    if (!gamePlayer) {
      return handleServerError(new Error('Game player not found'), 'ERR_REBUY_NO_PLAYER', 'Game player not found');
    }

    const updatedBuyIns = [...gamePlayer.buyIns, buyInAmount];

    const { error } = await supabase.from('game_players').update({ buyIns: updatedBuyIns }).eq('id', gamePlayerId);

    if (error) {
      return handleServerError(error, 'ERR_REBUY_UPDATE', 'Failed to add rebuy. Please try again.');
    }

    revalidatePath(`/game/${gameId}/live`);
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_REBUY_AUTH');
  }
}

export async function removeLastRebuy(gameId: string, gamePlayerId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check
    await requireAdmin(supabase);

    // Get current buy-ins
    const { data: gamePlayer } = await supabase
      .from('game_players')
      .select('buyIns')
      .eq('id', gamePlayerId)
      .single();

    if (!gamePlayer) {
      return handleServerError(new Error('Game player not found'), 'ERR_REMOVE_REBUY_NO_PLAYER', 'Game player not found');
    }

    // Must have at least 2 buy-ins (can't remove the initial buy-in)
    if (gamePlayer.buyIns.length <= 1) {
      return { error: 'Cannot remove initial buy-in' };
    }

    // Remove the last buy-in
    const updatedBuyIns = gamePlayer.buyIns.slice(0, -1);

    const { error } = await supabase.from('game_players').update({ buyIns: updatedBuyIns }).eq('id', gamePlayerId);

    if (error) {
      return handleServerError(error, 'ERR_REMOVE_REBUY_UPDATE', 'Failed to remove rebuy. Please try again.');
    }

    revalidatePath(`/game/${gameId}/live`);
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_REMOVE_REBUY_AUTH');
  }
}

export async function cashOutEarly(gameId: string, gamePlayerId: string, cashOutAmount: number) {
  try {
    const supabase = await createSupabaseServerClient();

    await requireAdmin(supabase);

    const result = EarlyCashOutSchema.safeParse({ gameId, gamePlayerId, cashOutAmount });
    if (!result.success) {
      return formatZodError(result.error);
    }

    // Fetch current buy-ins to validate cash-out doesn't exceed total buy-in
    const { data: gamePlayer } = await supabase
      .from('game_players')
      .select('buyIns')
      .eq('id', gamePlayerId)
      .single();

    if (!gamePlayer) {
      return handleServerError(new Error('Game player not found'), 'ERR_CASHOUT_NO_PLAYER', 'Game player not found');
    }

    const totalBuyIn = calculateTotalBuyIn(gamePlayer.buyIns);
    if (cashOutAmount > totalBuyIn) {
      return { error: `Cash-out cannot exceed total buy-in (${totalBuyIn})` };
    }

    const { error } = await supabase
      .from('game_players')
      .update({ cashOut: cashOutAmount })
      .eq('id', gamePlayerId);

    if (error) {
      return handleServerError(error, 'ERR_CASHOUT_UPDATE', 'Failed to record cash-out. Please try again.');
    }

    revalidatePath(`/game/${gameId}/live`);
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_CASHOUT_AUTH');
  }
}
