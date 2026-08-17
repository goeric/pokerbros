import { createEvent, EventAttributes } from 'ics';
import { Game, Location } from '@/types';

// Default timezone for all poker games (IANA timezone identifier)
const DEFAULT_TIMEZONE = 'America/Los_Angeles';

interface GenerateIcsOptions {
  game: Game;
  location: Location;
  playerEmail: string;
  status: 'CONFIRMED' | 'CANCELLED';
  sequence?: number;
  timezone?: string;
}

/**
 * Post-process ICS content to add timezone information
 * The ics library doesn't support TZID directly, so we inject it
 */
function addTimezoneToIcs(icsContent: string, timezone: string): string {
  // Replace DTSTART and DTEND with timezone-aware versions
  // Example: DTSTART:20240115T190000 -> DTSTART;TZID=America/Los_Angeles:20240115T190000
  let result = icsContent;

  // Add TZID to DTSTART (but not if it already has one or is UTC)
  result = result.replace(
    /DTSTART:(\d{8}T\d{6})/g,
    `DTSTART;TZID=${timezone}:$1`
  );

  // Add TZID to DTEND (but not if it already has one or is UTC)
  result = result.replace(
    /DTEND:(\d{8}T\d{6})/g,
    `DTEND;TZID=${timezone}:$1`
  );

  return result;
}

/**
 * Generates an iCalendar (.ics) file content for a poker game
 *
 * Key features:
 * - Same UID = updates same event in calendar apps
 * - STATUS: CONFIRMED for invites, CANCELLED for cancellations
 * - 4-hour duration from game start time
 *
 * `sequence` must come from `nextCalendarSequence()` — `games.calendar_sequence`
 * is the single source of truth for how far this game's invite has advanced.
 * Passing a constant is what caused repeat reschedules to be ignored by calendar
 * apps; see `20260816120000_add_calendar_sequence_to_games.sql`.
 */
export function generateGameIcs({
  game,
  location,
  playerEmail,
  status,
  sequence = 0,
  timezone = DEFAULT_TIMEZONE,
}: GenerateIcsOptions): string | null {
  try {
    // Parse game date and time
    const [year, month, day] = game.date.split('-').map(Number);
    const [hours, minutes] = game.time.split(':').map(Number);

    // Format dates for ics library: [year, month, day, hour, minute]
    const start: [number, number, number, number, number] = [year, month, day, hours, minutes];
    const end: [number, number, number, number, number] = [
      year,
      month,
      day,
      hours + 4, // 4-hour duration
      minutes,
    ];

    // Build description with game details
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const description = [
      `$${game.buyIn} buy-in`,
      game.notes ? `\n\n${game.notes}` : '',
      `\n\nView details: ${appUrl}/game/${game.id}`,
    ].join('');

    // Event attributes
    const event: EventAttributes = {
      start,
      end,
      startInputType: 'local',
      startOutputType: 'local',
      endInputType: 'local',
      endOutputType: 'local',
      title: `Poker Night at ${location.name}`,
      description,
      location: location.address,
      uid: `game-${game.id}@pokerbros.xyz`, // Same UID = updates same event
      sequence,
      status: status === 'CONFIRMED' ? 'CONFIRMED' : 'CANCELLED',
      organizer: {
        name: 'PokerBros',
        email: process.env.RESEND_FROM_EMAIL || 'poker@pokerbros.xyz',
      },
      attendees: [
        {
          name: playerEmail.split('@')[0],
          email: playerEmail,
          rsvp: true,
        },
      ],
      productId: 'pokerbros/icalendar',
      method: status === 'CANCELLED' ? 'CANCEL' : 'REQUEST',
    };

    // Generate .ics content
    const { error, value } = createEvent(event);

    if (error) {
      console.error('[ICS] Error generating calendar event:', error);
      return null;
    }

    if (!value) return null;

    // Post-process to add timezone (ics library doesn't support TZID directly)
    const icsWithTimezone = addTimezoneToIcs(value, timezone);
    return icsWithTimezone;
  } catch (error) {
    console.error('[ICS] Error generating calendar event:', error);
    return null;
  }
}
