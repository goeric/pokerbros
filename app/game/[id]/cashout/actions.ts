'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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

export async function finalizeGameResults(
  gameId: string,
  cashOuts: Record<string, number>
) {
  const supabase = createSupabaseServerClient();

  // Fetch game_players
  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select('*')
    .eq('gameId', gameId);

  if (!gamePlayers) {
    return { error: 'Game players not found' };
  }

  // Fetch all players
  const { data: players } = await supabase
    .from('players')
    .select('*');

  if (!players) {
    return { error: 'Players not found' };
  }

  // Validate totals
  const totalIn = gamePlayers.reduce((sum, gp) =>
    sum + gp.buyIns.reduce((total: number, buyIn: number) => total + buyIn, 0), 0
  );
  const totalOut = Object.values(cashOuts).reduce((sum, amount) => sum + amount, 0);
  const difference = totalOut - totalIn;

  if (Math.abs(difference) > 0.01) {
    return { error: `Totals don't match! Difference: $${Math.abs(difference).toFixed(2)}` };
  }

  // Update game players with cash-outs and profits
  for (const gamePlayer of gamePlayers) {
    const cashOut = cashOuts[gamePlayer.playerId] || 0;
    const totalBuyIn = gamePlayer.buyIns.reduce((sum: number, buyIn: number) => sum + buyIn, 0);
    const profit = cashOut - totalBuyIn;

    await supabase
      .from('game_players')
      .update({ cashOut, profit })
      .eq('id', gamePlayer.id);

    // Update player stats
    const player = players.find(p => p.id === gamePlayer.playerId);
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
  await supabase
    .from('games')
    .update({ status: 'completed' })
    .eq('id', gameId);

  revalidatePath(`/game/${gameId}`);
  redirect(`/game/${gameId}/results`);
}
