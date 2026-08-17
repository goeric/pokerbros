import { logger } from '@/lib/logger';

/**
 * Minimal shape of the Supabase clients used to emit invites. Both the
 * request-scoped SSR client and the service-role client satisfy it, and neither
 * is generically typed in this project, so structural typing keeps this helper
 * usable from either without another `as` cast at the call site.
 */
interface CalendarSequenceClient {
  rpc(
    fn: 'next_game_calendar_sequence',
    args: { p_game_id: string }
  ): PromiseLike<{ data: unknown; error: unknown }>;
}

/**
 * Reserves the next iCalendar SEQUENCE for a game.
 *
 * Every .ics we emit must carry a value from here. Calendar clients discard a
 * revision that does not raise SEQUENCE above the one they already hold, so a
 * shared, always-increasing counter is what makes a reschedule (or a
 * cancellation) actually land on someone's calendar. See the migration
 * `20260816120000_add_calendar_sequence_to_games.sql` for the full rationale.
 *
 * The bump is atomic in Postgres so two concurrent edits can't hand out the same
 * number for different revisions. If the RPC is unavailable, we fall back to the
 * caller's last known value + 1: still correct whenever there's a single writer,
 * which is the realistic case, and better than emitting an invite nobody applies.
 */
export async function nextCalendarSequence(
  supabase: CalendarSequenceClient,
  game: { id: string; calendar_sequence?: number | null }
): Promise<number> {
  const { data, error } = await supabase.rpc('next_game_calendar_sequence', {
    p_game_id: game.id,
  });

  if (!error && typeof data === 'number') {
    return data;
  }

  const fallback = (game.calendar_sequence ?? 0) + 1;
  const reason = error instanceof Error ? error.message : JSON.stringify(error ?? data);
  logger.error(
    `[ERR_CALENDAR_SEQUENCE] game=${game.id} atomic bump failed, using fallback ${fallback}: ${reason}`,
    { gameId: game.id, fallback, error }
  );
  return fallback;
}
