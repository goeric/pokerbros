'use server';

import { createClient } from '@supabase/supabase-js';
import { handleServerError } from '@/lib/auth-helpers';
import { sendEmail } from '@/lib/email/send-email';
import { generateGameIcs } from '@/lib/email/generate-ics';
import { nextCalendarSequence } from '@/lib/email/calendar-sequence';
import RsvpConfirmation from '@/emails/templates/RsvpConfirmation';
import RsvpCancellation from '@/emails/templates/RsvpCancellation';
import { formatDate, formatTime, formatPlayerName } from '@/lib/utils';
import { Game, Location, Player } from '@/types';
import { createEmailActionToken } from '@/lib/email/action-tokens';

// Create a service role client for server-side operations that bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Add RSVP via email token (bypasses authentication)
 * Authorization is proven by possession of valid token
 */
export async function addRSVPViaToken(gameId: string, playerId: string) {
  try {
    // Check if player already has an RSVP for this game
    const { data: existingRsvp } = await supabaseAdmin
      .from('rsvps')
      .select('*')
      .eq('gameId', gameId)
      .eq('playerId', playerId)
      .single();

    // If already RSVP'd, just return success
    if (existingRsvp) {
      return { success: true };
    }

    // Get current RSVPs to determine status
    const { data: rsvps } = await supabaseAdmin
      .from('rsvps')
      .select('*')
      .eq('gameId', gameId);

    const confirmedCount = rsvps?.filter((r) => r.status === 'confirmed').length || 0;
    const status = confirmedCount >= 8 ? 'waitlist' : 'confirmed';
    const waitlistPosition =
      status === 'waitlist' ? (rsvps?.filter((r) => r.status === 'waitlist').length || 0) + 1 : null;

    const { error } = await supabaseAdmin.from('rsvps').insert({
      gameId,
      playerId,
      status,
      waitlistPosition,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      return handleServerError(error, 'ERR_RSVP_ADD_TOKEN', 'Failed to add RSVP. Please try again.');
    }

    // Send confirmation email (only for confirmed RSVPs)
    if (status === 'confirmed') {
      const { data: game } = await supabaseAdmin
        .from('games')
        .select('*, locations(*)')
        .eq('id', gameId)
        .single();

      const { data: player } = await supabaseAdmin
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (game && player && player.email) {
        const location = game.locations as unknown as Location;

        // Generate cancel RSVP token
        const tokenResult = await createEmailActionToken({
          gameId,
          playerId,
          action: 'cancel_rsvp',
        });

        // Generate calendar invite
        const icsContent = generateGameIcs({
          game: game as Game,
          location,
          playerEmail: player.email,
          status: 'CONFIRMED',
          sequence: await nextCalendarSequence(supabaseAdmin, game as Game),
        });

        // Send confirmation email
        await sendEmail({
          to: player.email,
          subject: `RSVP Confirmed: ${formatDate(game.date)} Poker Night`,
          react: RsvpConfirmation({
            gameId: game.id,
            playerName: formatPlayerName(player as Player),
            date: formatDate(game.date),
            time: formatTime(game.time),
            location: location.name,
            address: location.address,
            buyIn: game.buyIn,
            notes: game.notes || undefined,
            cancelRsvpUrl: tokenResult.success ? tokenResult.url : undefined,
          }),
          icsContent: icsContent || undefined,
        });
      }
    }

    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_RSVP_ADD_TOKEN');
  }
}

/**
 * Cancel RSVP via email token (bypasses authentication)
 * Authorization is proven by possession of valid token
 */
export async function cancelRSVPViaToken(gameId: string, playerId: string) {
  try {
    // Get the RSVP to check status
    const { data: rsvp } = await supabaseAdmin
      .from('rsvps')
      .select('*')
      .eq('gameId', gameId)
      .eq('playerId', playerId)
      .single();

    // Fetch game, location, and player details for email (before deleting RSVP)
    const { data: game } = await supabaseAdmin
      .from('games')
      .select('*, locations(*)')
      .eq('id', gameId)
      .single();

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    // Delete the RSVP
    const { error } = await supabaseAdmin
      .from('rsvps')
      .delete()
      .eq('gameId', gameId)
      .eq('playerId', playerId);

    if (error) {
      return handleServerError(error, 'ERR_RSVP_CANCEL_TOKEN', 'Failed to cancel RSVP. Please try again.');
    }

    // Send cancellation email with calendar cancellation (only for confirmed RSVPs)
    if (rsvp?.status === 'confirmed' && game && player && player.email) {
      const location = game.locations as unknown as Location;

      // Generate one-click RSVP token (in case they want to RSVP again)
      const tokenResult = await createEmailActionToken({
        gameId,
        playerId,
        action: 'rsvp',
      });

      // Generate calendar cancellation. The CANCEL only withdraws the event if
      // its SEQUENCE beats the invite the player holds, so take the next value
      // from the shared per-game counter rather than a constant.
      const icsContent = generateGameIcs({
        game: game as Game,
        location,
        playerEmail: player.email,
        status: 'CANCELLED',
        sequence: await nextCalendarSequence(supabaseAdmin, game as Game),
      });

      // Send cancellation email
      await sendEmail({
        to: player.email,
        subject: `RSVP Cancelled: ${formatDate(game.date)} Poker Night`,
        react: RsvpCancellation({
          gameId: game.id,
          playerName: formatPlayerName(player as Player),
          date: formatDate(game.date),
          time: formatTime(game.time),
          location: location.name,
          rsvpUrl: tokenResult.success ? tokenResult.url : undefined,
        }),
        icsContent: icsContent || undefined,
      });
    }

    // Auto-promote first waitlist player if a confirmed spot opened
    if (rsvp?.status === 'confirmed') {
      await supabaseAdmin.rpc('promote_next_waitlist_player', {
        p_game_id: gameId,
      });
    }

    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_RSVP_CANCEL_TOKEN');
  }
}
