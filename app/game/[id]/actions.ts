'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers';
import { SupabaseClient } from '@supabase/supabase-js';
import { RSVPSchema, GameSchema, formatZodError } from '@/lib/validation';
import { MAX_SEATS, NOTIFIABLE_RSVP_STATUSES } from '@/lib/constants';
import { sendEmail } from '@/lib/email/send-email';
import { shouldSendNotification } from '@/lib/email/check-preferences';
import { generateGameIcs } from '@/lib/email/generate-ics';
import { nextCalendarSequence } from '@/lib/email/calendar-sequence';
import { createEmailActionToken } from '@/lib/email/action-tokens';
import RsvpConfirmation from '@/emails/templates/RsvpConfirmation';
import RsvpCancellation from '@/emails/templates/RsvpCancellation';
import WaitlistPromotion from '@/emails/templates/WaitlistPromotion';
import GameUpdated from '@/emails/templates/GameUpdated';
import GameCancelled from '@/emails/templates/GameCancelled';
import { formatDate, formatTime, formatPlayerName } from '@/lib/utils';
import { recomputePlayerStats } from '@/lib/player-stats';
import { logger } from '@/lib/logger';
import { Game, Location, Player } from '@/types';

export async function addRSVP(gameId: string, playerId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check - Allow admins OR users RSVPing for themselves
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized: Please sign in');
    }

    // Check if user is admin OR if they're RSVPing for themselves
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single();

    const isAdmin = !!adminUser;

    // If not admin, verify they're RSVPing for their own player account
    if (!isAdmin) {
      const { data: player } = await supabase
        .from('players')
        .select('email')
        .eq('id', playerId)
        .single();

      if (!player || player.email !== user.email) {
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
    const status = confirmedCount >= MAX_SEATS ? 'waitlist' : 'confirmed';
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
            sequence: await nextCalendarSequence(supabase, game as Game),
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized: Please sign in');
    }

    // Check if user is admin OR if they're canceling their own RSVP
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single();

    const isAdmin = !!adminUser;

    // If not admin, verify they're canceling their own RSVP
    if (!isAdmin) {
      const { data: player } = await supabase
        .from('players')
        .select('email')
        .eq('id', playerId)
        .single();

      if (!player || player.email !== user.email) {
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

      // Generate calendar cancellation. A CANCEL only withdraws the event if its
      // SEQUENCE beats the invite the player is holding, which climbs with every
      // reschedule — so it has to come from the shared counter, not a constant.
      const icsContent = generateGameIcs({
        game: game as Game,
        location,
        playerEmail: player.email,
        status: 'CANCELLED',
        sequence: await nextCalendarSequence(supabase, game as Game),
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
              sequence: await nextCalendarSequence(supabase, game as Game),
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

/**
 * Human-readable summary of what an admin changed about a game.
 * An empty list means the edit was a no-op and nobody needs to hear about it.
 */
function describeGameChanges({
  oldGame,
  oldLocation,
  newGame,
  newLocation,
}: {
  oldGame: Game;
  oldLocation: Location | null;
  newGame: { date: string; time: string; buyIn: number; location_id: string; notes?: string };
  newLocation: Location;
}): string[] {
  const changes: string[] = [];

  if (newGame.date !== oldGame.date) {
    changes.push(`Date changed: ${formatDate(oldGame.date)} → ${formatDate(newGame.date)}`);
  }
  if (newGame.time !== oldGame.time) {
    changes.push(`Time changed: ${formatTime(oldGame.time)} → ${formatTime(newGame.time)}`);
  }
  if (newGame.location_id !== oldGame.location_id) {
    changes.push(`Location changed: ${oldLocation?.name ?? 'TBD'} → ${newLocation.name}`);
  }
  if (newGame.buyIn !== oldGame.buyIn) {
    changes.push(`Buy-in changed: $${oldGame.buyIn} → $${newGame.buyIn}`);
  }
  // Notes are stored as NULL when blank but arrive as '', so compare normalized
  // values — otherwise saving an untouched form reports a phantom "Notes updated".
  if ((newGame.notes || '') !== (oldGame.notes || '')) {
    changes.push('Notes updated');
  }

  return changes;
}

/**
 * Emails every player holding a seat or a waitlist spot — excluding those with no
 * address on file or who have opted out of `game_updated` — that the game changed.
 *
 * Confirmed players get a fresh .ics so their existing calendar event moves.
 * Waitlisted players get the email only: they hold no live invite for this game
 * (`addRSVP` attaches one only for confirmed seats, and a cancellation withdraws
 * it), so a CONFIRMED .ics would put a game they aren't seated for on their
 * calendar. `emails/templates/GameUpdated.tsx` renders the matching copy.
 */
async function sendGameUpdatedNotifications({
  supabase,
  game,
  location,
  changes,
}: {
  supabase: SupabaseClient;
  game: Game;
  location: Location;
  changes: string[];
}): Promise<void> {
  const { data: rsvps, error } = await supabase
    .from('rsvps')
    .select('*, players(*)')
    .eq('gameId', game.id)
    .in('status', [...NOTIFIABLE_RSVP_STATUSES]);

  if (error) {
    // The write already committed and the response already shipped, so there is
    // nothing to fail back to — log with enough context to reconstruct it later.
    logger.error(
      `[ERR_GAME_UPDATE_NOTIFY] game=${game.id} could not load RSVPs, no one was notified: ${
        error.message ?? JSON.stringify(error)
      }`,
      { gameId: game.id, error }
    );
    return;
  }

  const recipients = rsvps ?? [];
  if (recipients.length === 0) return;

  // One shared revision for this edit: everyone is being told about the same
  // change, so they should all receive the same SEQUENCE.
  const sequence = await nextCalendarSequence(supabase, game);
  const changeSummary = changes.join('\n');

  logger.info(`[updateGame] game=${game.id} notifying ${recipients.length} player(s)`, {
    gameId: game.id,
  });

  let sent = 0;
  let dispatched = 0;
  const failures: string[] = [];

  for (const rsvp of recipients) {
    const player = rsvp.players as unknown as Player;

    // Isolate each recipient: one malformed player row must not cost everyone
    // after them their notification.
    try {
      if (!player?.email) continue;
      if (!(await shouldSendNotification(player.email, 'game_updated'))) continue;

      // Resend allows 2 requests/second. sendEmail only throttles *within* a
      // single call, and we send one email per player, so the pacing is ours.
      // Counts actual sends, not loop position, so skipped players cost nothing.
      if (dispatched > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      dispatched += 1;

      const isWaitlisted = rsvp.status === 'waitlist';

      const tokenResult = await createEmailActionToken({
        gameId: game.id,
        playerId: player.id,
        action: 'cancel_rsvp',
      });

      if (!tokenResult.success) {
        // The email still sends, degraded to a plain link by the template. Worth
        // a line: for waitlisted players this is the "Leave the waitlist" button.
        logger.error(
          `[ERR_GAME_UPDATE_TOKEN] game=${game.id} player=${player.id} one-click cancel link unavailable`,
          { gameId: game.id, playerId: player.id }
        );
      }

      // Waitlisted players get no .ics — see this function's doc comment.
      const icsContent = isWaitlisted
        ? null
        : generateGameIcs({
            game,
            location,
            playerEmail: player.email,
            status: 'CONFIRMED',
            sequence,
          });

      const result = await sendEmail({
        to: player.email,
        subject: `Game Update: ${formatDate(game.date)} Poker Night`,
        react: GameUpdated({
          gameId: game.id,
          playerName: formatPlayerName(player),
          changes: changeSummary,
          date: formatDate(game.date),
          time: formatTime(game.time),
          location: location.name,
          address: location.address,
          buyIn: game.buyIn,
          notes: game.notes || undefined,
          cancelRsvpUrl: tokenResult.success ? tokenResult.url : undefined,
          waitlisted: isWaitlisted,
        }),
        icsContent: icsContent || undefined,
      });

      // sendEmail catches internally and never throws, so this returned value is
      // the only channel a delivery failure can be observed through.
      if (result.success) {
        sent += 1;
      } else {
        failures.push(`${player.email}: ${result.error ?? 'unknown error'}`);
      }
    } catch (playerError) {
      failures.push(
        `${player?.email ?? `player ${player?.id ?? 'unknown'}`}: ${
          playerError instanceof Error ? playerError.message : String(playerError)
        }`
      );
    }
  }

  if (failures.length > 0) {
    logger.error(
      `[ERR_GAME_UPDATE_NOTIFY] game=${game.id} ${failures.length} of ${
        recipients.length
      } update emails failed: ${failures.join('; ')}`,
      { gameId: game.id, failures }
    );
  } else {
    logger.info(`[updateGame] game=${game.id} notified ${sent} player(s)`, { gameId: game.id });
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

    // Both reads are independent, so run them together. Their errors must be
    // checked: without oldGame there are no changes to describe, and silently
    // continuing would write the game and tell nobody — the exact failure this
    // action exists to prevent.
    const [
      { data: oldGame, error: oldGameError },
      { data: newLocation, error: locationError },
    ] = await Promise.all([
      supabase.from('games').select('*, locations(*)').eq('id', gameId).single(),
      supabase.from('locations').select('*').eq('id', validData.location_id).single(),
    ]);

    if (oldGameError || !oldGame) {
      return handleServerError(
        oldGameError ?? new Error(`Game ${gameId} not found`),
        'ERR_GAME_UPDATE_FETCH',
        'Could not load the current game details, so nothing was changed. Please try again.'
      );
    }

    if (locationError || !newLocation) {
      return handleServerError(
        locationError ?? new Error(`Location ${validData.location_id} not found`),
        'ERR_GAME_UPDATE_LOCATION',
        'That location could not be found. Pick a location and try again.'
      );
    }

    const changes = describeGameChanges({
      oldGame: oldGame as Game,
      oldLocation: (oldGame.locations as unknown as Location) ?? null,
      newGame: validData,
      newLocation: newLocation as Location,
    });

    const { data: updatedGame, error } = await supabase
      .from('games')
      .update({
        date: validData.date,
        time: validData.time,
        buyIn: validData.buyIn,
        location_id: validData.location_id,
        venue: newLocation.name, // Populate venue for backward compatibility
        notes: validData.notes || null,
      })
      .eq('id', gameId)
      .select()
      .maybeSingle();

    if (error) {
      return handleServerError(error, 'ERR_GAME_UPDATE', 'Failed to update game. Please try again.');
    }

    // Notify off the request path. Each recipient costs several sequential round
    // trips (preference check, token mint, feature-flag lookup, Resend call) plus
    // a 1s pause for Resend's rate limit, so a full table would otherwise stall
    // the admin's save long enough to time out.
    if (changes.length > 0 && updatedGame) {
      after(async () => {
        try {
          await sendGameUpdatedNotifications({
            // Safe to reuse the request-scoped client after the response: the
            // background work only reads, and never writes cookies back.
            supabase,
            game: updatedGame as Game,
            location: newLocation as Location,
            changes,
          });
        } catch (notificationError) {
          logger.error(
            `[ERR_GAME_UPDATE_NOTIFY] game=${gameId} notifications threw: ${
              notificationError instanceof Error
                ? notificationError.message
                : String(notificationError)
            }`,
            { gameId, error: notificationError }
          );
        }
      });
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

    // Capture participants BEFORE deletion. Deleting the game cascade-removes
    // its game_players, so a completed game's contribution must be reversed out
    // of each player's lifetime aggregate stats afterwards.
    const { data: affectedGamePlayers } = await supabase
      .from('game_players')
      .select('playerId')
      .eq('gameId', gameId);

    const affectedPlayerIds = [...new Set((affectedGamePlayers ?? []).map((gp) => gp.playerId))];

    // Reserve the cancellation's SEQUENCE while the row still exists. It has to
    // beat the invite attendees are holding — which climbs with every reschedule
    // — or their calendar keeps showing a game that is no longer happening.
    const cancellationSequence = game
      ? await nextCalendarSequence(supabase, game as Game)
      : 1;

    const { error } = await supabase.from('games').delete().eq('id', gameId);

    if (error) {
      return handleServerError(error, 'ERR_GAME_DELETE', 'Failed to delete game. Please try again.');
    }

    // Recompute stats from source for everyone who played the deleted game.
    for (const playerId of affectedPlayerIds) {
      const { error: statError } = await recomputePlayerStats(supabase, playerId);
      if (statError) {
        logger.error('[deleteGame] stat recompute failed', { gameId, playerId, error: statError });
      }
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
            sequence: cancellationSequence,
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
