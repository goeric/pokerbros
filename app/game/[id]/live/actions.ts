'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers';
import { RebuySchema, formatZodError } from '@/lib/validation';

// Note: This function is no longer used - initialization happens inline in page.tsx
// Kept here for reference or potential future use
export async function initializeGamePlayers(gameId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check
    await requireAdmin(supabase);

    // Get game buy-in amount
    const { data: game } = await supabase.from('games').select('buyIn').eq('id', gameId).single();

    if (!game) {
      return handleServerError(new Error('Game not found'), 'ERR_INIT_NO_GAME', 'Game not found');
    }

    // Get all confirmed RSVPs
    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('*')
      .eq('gameId', gameId)
      .eq('status', 'confirmed');

    if (!rsvps || rsvps.length === 0) {
      return handleServerError(new Error('No confirmed RSVPs'), 'ERR_INIT_NO_RSVPS', 'No confirmed RSVPs found');
    }

    // Get existing game_players
    const { data: existingGamePlayers } = await supabase.from('game_players').select('*').eq('gameId', gameId);

    // Find RSVPs that don't have game_player entries yet
    const existingPlayerIds = new Set(existingGamePlayers?.map((gp) => gp.playerId) || []);
    const newRsvps = rsvps.filter((rsvp) => !existingPlayerIds.has(rsvp.playerId));

    // Only insert if there are new players
    if (newRsvps.length > 0) {
      const gamePlayersToInsert = newRsvps.map((rsvp) => ({
        gameId,
        playerId: rsvp.playerId,
        buyIns: [game.buyIn],
        cashOut: 0,
        profit: 0,
      }));

      const { error } = await supabase.from('game_players').insert(gamePlayersToInsert);

      if (error) {
        return handleServerError(error, 'ERR_INIT_INSERT', 'Failed to initialize players');
      }

      // Only revalidate if we actually added players
      revalidatePath(`/game/${gameId}/live`);
    }

    return { success: true, addedPlayers: newRsvps.length };
  } catch (error) {
    return handleServerError(error, 'ERR_INIT_AUTH');
  }
}

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
