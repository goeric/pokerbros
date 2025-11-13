'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function createSupabaseServerClient() {
  const cookieStore = await cookies();
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

export async function addRSVP(gameId: string, playerId: string) {
  const supabase = await createSupabaseServerClient();

  // Get current RSVPs to determine status
  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('*')
    .eq('gameId', gameId);

  const confirmedCount = rsvps?.filter(r => r.status === 'confirmed').length || 0;
  const status = confirmedCount >= 8 ? 'waitlist' : 'confirmed';
  const waitlistPosition = status === 'waitlist'
    ? (rsvps?.filter(r => r.status === 'waitlist').length || 0) + 1
    : null;

  const { error } = await supabase.from('rsvps').insert({
    gameId,
    playerId,
    status,
    waitlistPosition,
    timestamp: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/game/${gameId}`);
  return { success: true };
}

export async function cancelRSVP(gameId: string, playerId: string) {
  const supabase = await createSupabaseServerClient();

  // Get the RSVP to check status
  const { data: rsvp } = await supabase
    .from('rsvps')
    .select('*')
    .eq('gameId', gameId)
    .eq('playerId', playerId)
    .single();

  // Delete the RSVP
  const { error } = await supabase
    .from('rsvps')
    .delete()
    .eq('gameId', gameId)
    .eq('playerId', playerId);

  if (error) {
    return { error: error.message };
  }

  // Auto-promote first waitlist player if a confirmed spot opened
  if (rsvp?.status === 'confirmed') {
    const { data: waitlist } = await supabase
      .from('rsvps')
      .select('*')
      .eq('gameId', gameId)
      .eq('status', 'waitlist')
      .order('waitlistPosition', { ascending: true })
      .limit(1);

    if (waitlist && waitlist.length > 0) {
      await supabase
        .from('rsvps')
        .update({ status: 'confirmed', waitlistPosition: null })
        .eq('id', waitlist[0].id);
    }
  }

  revalidatePath(`/game/${gameId}`);
  return { success: true };
}

export async function startGame(gameId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('games')
    .update({ status: 'in_progress' })
    .eq('id', gameId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/game/${gameId}`);
  return { success: true };
}

export async function updateGame(
  gameId: string,
  gameData: { date: string; time: string; buyIn: number; venue: string; notes: string }
) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('games')
    .update({
      date: gameData.date,
      time: gameData.time,
      buyIn: gameData.buyIn,
      venue: gameData.venue,
      notes: gameData.notes || null,
    })
    .eq('id', gameId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/game/${gameId}`);
  return { success: true };
}

export async function deleteGame(gameId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}
