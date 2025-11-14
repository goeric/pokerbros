'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers';
import { RSVPSchema, GameSchema, formatZodError } from '@/lib/validation';

export async function addRSVP(gameId: string, playerId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check - Allow admins OR users RSVPing for themselves
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Unauthorized: Please sign in');
    }

    // Check if user is admin OR if they're RSVPing for themselves
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', session.user.id)
      .single();

    const isAdmin = !!adminUser;

    // If not admin, verify they're RSVPing for their own player account
    if (!isAdmin) {
      const { data: player } = await supabase
        .from('players')
        .select('email')
        .eq('id', playerId)
        .single();

      if (!player || player.email !== session.user.email) {
        throw new Error('Unauthorized: You can only RSVP for yourself');
      }
    }

    // ✅ Input validation
    const result = RSVPSchema.safeParse({ gameId, playerId });
    if (!result.success) {
      return formatZodError(result.error);
    }

    // Get current RSVPs to determine status
    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('*')
      .eq('gameId', gameId);

    const confirmedCount = rsvps?.filter((r) => r.status === 'confirmed').length || 0;
    const status = confirmedCount >= 8 ? 'waitlist' : 'confirmed';
    const waitlistPosition =
      status === 'waitlist' ? (rsvps?.filter((r) => r.status === 'waitlist').length || 0) + 1 : null;

    const { error } = await supabase.from('rsvps').insert({
      gameId,
      playerId,
      status,
      waitlistPosition,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      return handleServerError(error, 'ERR_RSVP_ADD', 'Failed to add RSVP. Please try again.');
    }

    revalidatePath(`/game/${gameId}`);
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_RSVP_ADD_AUTH');
  }
}

export async function cancelRSVP(gameId: string, playerId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check - Allow admins OR users canceling their own RSVP
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Unauthorized: Please sign in');
    }

    // Check if user is admin OR if they're canceling their own RSVP
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', session.user.id)
      .single();

    const isAdmin = !!adminUser;

    // If not admin, verify they're canceling their own RSVP
    if (!isAdmin) {
      const { data: player } = await supabase
        .from('players')
        .select('email')
        .eq('id', playerId)
        .single();

      if (!player || player.email !== session.user.email) {
        throw new Error('Unauthorized: You can only cancel your own RSVP');
      }
    }

    // ✅ Input validation
    const result = RSVPSchema.safeParse({ gameId, playerId });
    if (!result.success) {
      return formatZodError(result.error);
    }

    // Get the RSVP to check status
    const { data: rsvp } = await supabase
      .from('rsvps')
      .select('*')
      .eq('gameId', gameId)
      .eq('playerId', playerId)
      .single();

    // Delete the RSVP
    const { error } = await supabase.from('rsvps').delete().eq('gameId', gameId).eq('playerId', playerId);

    if (error) {
      return handleServerError(error, 'ERR_RSVP_CANCEL', 'Failed to cancel RSVP. Please try again.');
    }

    // Auto-promote first waitlist player if a confirmed spot opened
    // Use database function for atomic operation to prevent race conditions
    if (rsvp?.status === 'confirmed') {
      await supabase.rpc('promote_next_waitlist_player', { p_game_id: gameId });
    }

    revalidatePath(`/game/${gameId}`);
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_RSVP_CANCEL_AUTH');
  }
}

export async function startGame(gameId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check
    await requireAdmin(supabase);

    const { error } = await supabase.from('games').update({ status: 'in_progress' }).eq('id', gameId);

    if (error) {
      return handleServerError(error, 'ERR_GAME_START', 'Failed to start game. Please try again.');
    }

    revalidatePath(`/game/${gameId}`);
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_GAME_START_AUTH');
  }
}

export async function updateGame(
  gameId: string,
  gameData: { date: string; time: string; buyIn: number; venue: string; notes: string }
) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check
    await requireAdmin(supabase);

    // ✅ Input validation
    const result = GameSchema.safeParse(gameData);
    if (!result.success) {
      return formatZodError(result.error);
    }

    const validData = result.data;

    const { error } = await supabase
      .from('games')
      .update({
        date: validData.date,
        time: validData.time,
        buyIn: validData.buyIn,
        venue: validData.venue,
        notes: validData.notes || null,
      })
      .eq('id', gameId);

    if (error) {
      return handleServerError(error, 'ERR_GAME_UPDATE', 'Failed to update game. Please try again.');
    }

    revalidatePath(`/game/${gameId}`);
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_GAME_UPDATE_AUTH');
  }
}

export async function deleteGame(gameId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check
    await requireAdmin(supabase);

    const { error } = await supabase.from('games').delete().eq('id', gameId);

    if (error) {
      return handleServerError(error, 'ERR_GAME_DELETE', 'Failed to delete game. Please try again.');
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_GAME_DELETE_AUTH');
  }
}
