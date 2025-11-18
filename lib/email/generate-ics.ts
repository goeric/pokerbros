import { createEvent, EventAttributes } from 'ics';
import { Game, Location } from '@/types';

interface GenerateIcsOptions {
  game: Game;
  location: Location;
  playerEmail: string;
  status: 'CONFIRMED' | 'CANCELLED';
  sequence?: number;
}

/**
 * Generates an iCalendar (.ics) file content for a poker game
 *
 * Key features:
 * - Same UID = updates same event in calendar apps
 * - SEQUENCE increments on updates
 * - STATUS: CONFIRMED for invites, CANCELLED for cancellations
 * - 4-hour duration from game start time
 */
export function generateGameIcs({
  game,
  location,
  playerEmail,
  status,
  sequence = 0,
}: GenerateIcsOptions): string | null {
  try {
    // Parse game date and time
    const [year, month, day] = game.date.split('-').map(Number);
    const [hours, minutes] = game.time.split(':').map(Number);

    // Create start date/time (local time)
    const startDate = new Date(year, month - 1, day, hours, minutes);

    // End time: 4 hours after start
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 4);

    // Format dates for ics library: [year, month, day, hour, minute]
    const start: [number, number, number, number, number] = [
      startDate.getFullYear(),
      startDate.getMonth() + 1, // ics library uses 1-indexed months
      startDate.getDate(),
      startDate.getHours(),
      startDate.getMinutes(),
    ];

    const end: [number, number, number, number, number] = [
      endDate.getFullYear(),
      endDate.getMonth() + 1,
      endDate.getDate(),
      endDate.getHours(),
      endDate.getMinutes(),
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
      title: `Poker Night at ${location.name}`,
      description,
      location: location.address,
      uid: `game-${game.id}@pokerbros.xyz`, // Same UID = updates same event
      sequence, // Increment on updates
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

    return value || null;
  } catch (error) {
    console.error('[ICS] Error generating calendar event:', error);
    return null;
  }
}

/**
 * Get the next sequence number for a game update
 * In practice, you might store this in the database per player/game
 * For now, we'll increment based on update operations
 */
export function getNextSequence(currentSequence: number = 0): number {
  return currentSequence + 1;
}
