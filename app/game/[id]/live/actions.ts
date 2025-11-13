'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Ignore
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name);
          } catch (error) {
            // Ignore
          }
        },
      },
    }
  );
}

export async function initializeGamePlayers(gameId: string) {
  const supabase = createSupabaseServerClient();

  // Get game buy-in amount
  const { data: game } = await supabase
    .from('games')
    .select('buyIn')
    .eq('id', gameId)
    .single();

  if (!game) {
    return { error: 'Game not found' };
  }

  // Get all confirmed RSVPs
  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('*')
    .eq('gameId', gameId)
    .eq('status', 'confirmed');

  if (!rsvps || rsvps.length === 0) {
    return { error: 'No confirmed RSVPs found' };
  }

  // Get existing game_players
  const { data: existingGamePlayers } = await supabase
    .from('game_players')
    .select('*')
    .eq('gameId', gameId);

  // Find RSVPs that don't have game_player entries yet
  const existingPlayerIds = new Set(existingGamePlayers?.map(gp => gp.playerId) || []);
  const newRsvps = rsvps.filter(rsvp => !existingPlayerIds.has(rsvp.playerId));

  // Only insert if there are new players
  if (newRsvps.length > 0) {
    const gamePlayersToInsert = newRsvps.map(rsvp => ({
      gameId,
      playerId: rsvp.playerId,
      buyIns: [game.buyIn],
      cashOut: 0,
      profit: 0,
    }));

    const { error } = await supabase.from('game_players').insert(gamePlayersToInsert);

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath(`/game/${gameId}/live`);
  return { success: true, addedPlayers: newRsvps.length };
}

export async function addRebuy(gameId: string, gamePlayerId: string, buyInAmount: number) {
  const supabase = createSupabaseServerClient();

  // Get current buy-ins
  const { data: gamePlayer } = await supabase
    .from('game_players')
    .select('buyIns')
    .eq('id', gamePlayerId)
    .single();

  if (!gamePlayer) {
    return { error: 'Game player not found' };
  }

  const updatedBuyIns = [...gamePlayer.buyIns, buyInAmount];

  const { error } = await supabase
    .from('game_players')
    .update({ buyIns: updatedBuyIns })
    .eq('id', gamePlayerId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/game/${gameId}/live`);
  return { success: true };
}
