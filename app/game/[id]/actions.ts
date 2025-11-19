'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers';
import { RSVPSchema, GameSchema, formatZodError } from '@/lib/validation';
import { sendEmail } from '@/lib/email/send-email';
import { shouldSendNotification } from '@/lib/email/check-preferences';
import { generateGameIcs } from '@/lib/email/generate-ics';
import { createEmailActionToken } from '@/lib/email/action-tokens';
import RsvpConfirmation from '@/emails/templates/RsvpConfirmation';
import RsvpCancellation from '@/emails/templates/RsvpCancellation';
import WaitlistPromotion from '@/emails/templates/WaitlistPromotion';
import GameUpdated from '@/emails/templates/GameUpdated';
import GameCancelled from '@/emails/templates/GameCancelled';
import { formatDate, formatTime, formatPlayerName } from '@/lib/utils';
import { Game, Location, Player } from '@/types';

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

    // Send confirmation email with calendar invite (only for confirmed RSVPs)
    if (status === 'confirmed') {
      // Fetch game, location, and player details
      const { data: game } = await supabase
        .from('games')
        .select('*, locations(*)')
        .eq('id', gameId)
        .single();

      const { data: player } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (game && player && player.email) {
        const location = game.locations as unknown as Location;

        // Generate one-click cancel RSVP token
        const tokenResult = await createEmailActionToken({
          gameId,
          playerId,
          action: 'cancel_rsvp',
        });

        // Generate calendar invite
        // Check if player wants RSVP confirmation emails
        if (await shouldSendNotification(player.email, 'rsvp_confirmed')) {
          const icsContent = generateGameIcs({
            game: game as Game,
            location,
            playerEmail: player.email,
            status: 'CONFIRMED',
            sequence: 0,
          });

          // Send email with calendar invite
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

    // Fetch game, location, and player details for email (before deleting RSVP)
    const { data: game } = await supabase
      .from('games')
      .select('*, locations(*)')
      .eq('id', gameId)
      .single();

    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    // Delete the RSVP
    const { error } = await supabase.from('rsvps').delete().eq('gameId', gameId).eq('playerId', playerId);

    if (error) {
      return handleServerError(error, 'ERR_RSVP_CANCEL', 'Failed to cancel RSVP. Please try again.');
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

      // Generate calendar cancellation
      const icsContent = generateGameIcs({
        game: game as Game,
        location,
        playerEmail: player.email,
        status: 'CANCELLED',
        sequence: 1, // Increment sequence for update
      });

      // Send cancellation email (check preference)
      if (await shouldSendNotification(player.email, 'rsvp_cancelled')) {
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
    }

    // Auto-promote first waitlist player if a confirmed spot opened
    // Use database function for atomic operation to prevent race conditions
    if (rsvp?.status === 'confirmed') {
      const { data: promotedRsvpId } = await supabase.rpc('promote_next_waitlist_player', {
        p_game_id: gameId,
      });

      // If someone was promoted, send them a promotion email
      if (promotedRsvpId && game) {
        const { data: promotedRsvp } = await supabase
          .from('rsvps')
          .select('*, players(*)')
          .eq('id', promotedRsvpId)
          .single();

        if (promotedRsvp && promotedRsvp.players) {
          const promotedPlayer = promotedRsvp.players as unknown as Player;
          if (promotedPlayer && promotedPlayer.email) {
            const location = game.locations as unknown as Location;

            // Generate one-click cancel RSVP token
            const tokenResult = await createEmailActionToken({
              gameId,
              playerId: promotedPlayer.id,
              action: 'cancel_rsvp',
            });

            // Generate calendar invite for promoted player
            const icsContent = generateGameIcs({
              game: game as Game,
              location,
              playerEmail: promotedPlayer.email,
              status: 'CONFIRMED',
              sequence: 0,
            });

            // Send waitlist promotion email (check preference)
            if (await shouldSendNotification(promotedPlayer.email, 'waitlist_promoted')) {
              await sendEmail({
                to: promotedPlayer.email,
                subject: `You're In! ${formatDate(game.date)} Poker Night`,
                react: WaitlistPromotion({
                  gameId: game.id,
                  playerName: formatPlayerName(promotedPlayer),
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
        }
      }
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
  gameData: { date: string; time: string; buyIn: number; location_id: string; notes: string }
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

    // Fetch old game data before updating (for change detection)
    const { data: oldGame } = await supabase
      .from('games')
      .select('*, locations(*)')
      .eq('id', gameId)
      .single();

    // Fetch new location details
    const { data: newLocation } = await supabase
      .from('locations')
      .select('*')
      .eq('id', validData.location_id)
      .single();

    const { error } = await supabase
      .from('games')
      .update({
        date: validData.date,
        time: validData.time,
        buyIn: validData.buyIn,
        location_id: validData.location_id,
        venue: newLocation?.name || '', // Populate venue for backward compatibility
        notes: validData.notes || null,
      })
      .eq('id', gameId);

    if (error) {
      return handleServerError(error, 'ERR_GAME_UPDATE', 'Failed to update game. Please try again.');
    }

    // Send update email to all confirmed RSVPs
    if (oldGame && newLocation) {
      const oldLocation = oldGame.locations as unknown as Location;

      // Detect what changed
      const changes: string[] = [];
      if (validData.date !== oldGame.date) {
        changes.push(`Date changed: ${formatDate(oldGame.date)} → ${formatDate(validData.date)}`);
      }
      if (validData.time !== oldGame.time) {
        changes.push(`Time changed: ${formatTime(oldGame.time)} → ${formatTime(validData.time)}`);
      }
      if (validData.location_id !== oldGame.location_id) {
        changes.push(`Location changed: ${oldLocation.name} → ${newLocation.name}`);
      }
      if (validData.buyIn !== oldGame.buyIn) {
        changes.push(`Buy-in changed: $${oldGame.buyIn} → $${validData.buyIn}`);
      }
      if (validData.notes !== oldGame.notes) {
        changes.push('Notes updated');
      }

      // Only send email if something actually changed
      if (changes.length > 0) {
        // Get all confirmed RSVPs
        const { data: rsvps } = await supabase
          .from('rsvps')
          .select('*, players(*)')
          .eq('gameId', gameId)
          .eq('status', 'confirmed');

        // Send update email to each confirmed player
        if (rsvps && rsvps.length > 0) {
          for (const rsvp of rsvps) {
            const player = rsvp.players as unknown as Player;
            if (player && player.email) {
              // Generate one-click cancel RSVP token
              const tokenResult = await createEmailActionToken({
                gameId,
                playerId: player.id,
                action: 'cancel_rsvp',
              });

              // Generate updated calendar invite
              const icsContent = generateGameIcs({
                game: {
                  ...oldGame,
                  date: validData.date,
                  time: validData.time,
                  buyIn: validData.buyIn,
                  location_id: validData.location_id,
                  notes: validData.notes || null,
                } as Game,
                location: newLocation,
                playerEmail: player.email,
                status: 'CONFIRMED',
                sequence: 1, // Increment sequence for update
              });

              await sendEmail({
                to: player.email,
                subject: `Game Update: ${formatDate(validData.date)} Poker Night`,
                react: GameUpdated({
                  gameId: oldGame.id,
                  playerName: formatPlayerName(player),
                  changes: changes.join('\n'),
                  date: formatDate(validData.date),
                  time: formatTime(validData.time),
                  location: newLocation.name,
                  address: newLocation.address,
                  buyIn: validData.buyIn,
                  notes: validData.notes || undefined,
                  cancelRsvpUrl: tokenResult.success ? tokenResult.url : undefined,
                }),
                icsContent: icsContent || undefined,
              });
            }
          }
        }
      }
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

    // Fetch game and location details before deleting
    const { data: game } = await supabase
      .from('games')
      .select('*, locations(*)')
      .eq('id', gameId)
      .single();

    // Get all confirmed RSVPs to notify players
    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('*, players(*)')
      .eq('gameId', gameId)
      .eq('status', 'confirmed');

    const { error } = await supabase.from('games').delete().eq('id', gameId);

    if (error) {
      return handleServerError(error, 'ERR_GAME_DELETE', 'Failed to delete game. Please try again.');
    }

    // Send cancellation email to all confirmed players
    if (game && rsvps && rsvps.length > 0) {
      const location = game.locations as unknown as Location;

      for (const rsvp of rsvps) {
        const player = rsvp.players as unknown as Player;
        if (player && player.email) {
          // Generate calendar cancellation
          const icsContent = generateGameIcs({
            game: game as Game,
            location,
            playerEmail: player.email,
            status: 'CANCELLED',
            sequence: 1, // Increment sequence for cancellation
          });

          await sendEmail({
            to: player.email,
            subject: `Game Cancelled: ${formatDate(game.date)} Poker Night`,
            react: GameCancelled({
              playerName: formatPlayerName(player),
              date: formatDate(game.date),
              time: formatTime(game.time),
              location: location.name,
            }),
            icsContent: icsContent || undefined,
          });
        }
      }
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_GAME_DELETE_AUTH');
  }
}
