'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, requireAdmin, requireGameNotCompleted, handleServerError } from '@/lib/auth-helpers';
import { RebuySchema, EarlyCashOutSchema, WalkInSchema, formatZodError } from '@/lib/validation';

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

    const guard = await requireGameNotCompleted(supabase, gameId, 'Rebuys are only allowed during a live game.');
    if ('error' in guard) return guard;

    // Filtered by gameId to prevent cross-game mutations
    const { data: gamePlayer } = await supabase
      .from('game_players')
      .select('buyIns')
      .eq('id', gamePlayerId)
      .eq('gameId', gameId)
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

    const guard = await requireGameNotCompleted(supabase, gameId, 'Rebuys are only allowed during a live game.');
    if ('error' in guard) return guard;

    // Filtered by gameId to prevent cross-game mutations
    const { data: gamePlayer } = await supabase
      .from('game_players')
      .select('buyIns')
      .eq('id', gamePlayerId)
      .eq('gameId', gameId)
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

export async function addWalkInPlayer(gameId: string, playerId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    await requireAdmin(supabase);

    const result = WalkInSchema.safeParse({ gameId, playerId });
    if (!result.success) {
      return formatZodError(result.error);
    }

    const guard = await requireGameNotCompleted(supabase, gameId, 'Cannot add a walk-in to a completed game.');
    if ('error' in guard) return guard;
    const { game } = guard;

    // Unique constraint on (gameId, playerId) enforces no duplicates — let INSERT fail with 23505
    const { error } = await supabase.from('game_players').insert({
      gameId,
      playerId,
      buyIns: [game.buyIn],
      cashOut: 0,
      profit: 0,
    });

    if (error) {
      if (error.code === '23505') {
        return { error: 'Player is already in this game.' };
      }
      return handleServerError(error, 'ERR_WALKIN_INSERT', 'Failed to add walk-in player. Please try again.');
    }

    revalidatePath(`/game/${gameId}/live`);
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_WALKIN_AUTH');
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

    const guard = await requireGameNotCompleted(supabase, gameId, 'Cash-out is only allowed during a live game.');
    if ('error' in guard) return guard;

    // Filtered by both id and gameId to prevent cross-game mutations
    const { data: gamePlayer, error: fetchError } = await supabase
      .from('game_players')
      .select('buyIns')
      .eq('id', gamePlayerId)
      .eq('gameId', gameId)
      .single();

    if (fetchError) {
      return handleServerError(fetchError, 'ERR_CASHOUT_FETCH_PLAYER', 'Failed to load player data. Please try again.');
    }

    if (!gamePlayer) {
      return handleServerError(new Error('Game player not found'), 'ERR_CASHOUT_NO_PLAYER', 'Game player not found');
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
