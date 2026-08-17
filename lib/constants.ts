import { RsvpStatus } from '@/types';

export const MAX_SEATS = 8;

/**
 * RSVP statuses that should hear about a change to the game.
 *
 * Waitlisted players are included deliberately: they may still be promoted, so a
 * reschedule matters to them. `declined` is excluded — they opted out.
 *
 * Declared as a typed constant so a typo (`'waitlisted'`) fails to compile. The
 * Supabase client is untyped here, so an inline literal in `.in('status', [...])`
 * would silently match nothing and quietly reintroduce the bug this list fixes.
 */
export const NOTIFIABLE_RSVP_STATUSES: readonly RsvpStatus[] = ['confirmed', 'waitlist'];
