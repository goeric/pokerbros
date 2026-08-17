/**
 * P1 IMPORTANT TESTS: Game Update Notifications
 *
 * Why Important: Rescheduling a game must reach everyone holding a seat OR a
 * waitlist spot, with a calendar invite that actually supersedes the one already
 * on their calendar. A failure here doesn't corrupt data — it sends players to
 * the wrong place on the wrong night.
 *
 * Priority: P1.6
 */
import { updateGame } from '@/app/game/[id]/actions';
import { createSupabaseServerClient, requireAdmin } from '@/lib/auth-helpers';
import { sendEmail } from '@/lib/email/send-email';
import { shouldSendNotification } from '@/lib/email/check-preferences';
import { createEmailActionToken } from '@/lib/email/action-tokens';
import { createEvent } from 'ics';
import { renderToStaticMarkup } from 'react-dom/server';

// `after` is wrapped rather than passed directly: jest.mock factories are hoisted
// above the imports and run while `@/app/game/[id]/actions` is first required,
// which is before `mockAfter` leaves its TDZ. `after: mockAfter` would throw.
const mockAfter = jest.fn();

jest.mock('next/server', () => ({
  after: (callback: () => Promise<void> | void) => mockAfter(callback),
}));

jest.mock('@/lib/auth-helpers', () => ({
  createSupabaseServerClient: jest.fn(),
  requireAdmin: jest.fn(),
  handleServerError: jest.fn((error: unknown, _code?: string, message?: string) => ({
    error: message || (error instanceof Error ? error.message : 'An error occurred'),
  })),
}));

jest.mock('@/lib/email/send-email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/email/check-preferences', () => ({
  shouldSendNotification: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/email/action-tokens', () => ({
  createEmailActionToken: jest
    .fn()
    .mockResolvedValue({ success: true, url: 'https://example.com/cancel' }),
}));

const mockCreateSupabaseServerClient = createSupabaseServerClient as jest.MockedFunction<
  typeof createSupabaseServerClient
>;
const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockShouldSendNotification = shouldSendNotification as jest.MockedFunction<
  typeof shouldSendNotification
>;
const mockCreateEmailActionToken = createEmailActionToken as jest.MockedFunction<
  typeof createEmailActionToken
>;
const mockCreateEvent = createEvent as jest.MockedFunction<typeof createEvent>;

const GAME_ID = '123e4567-e89b-12d3-a456-426614174000';
const OLD_LOCATION_ID = '223e4567-e89b-12d3-a456-426614174001';
const NEW_LOCATION_ID = '223e4567-e89b-12d3-a456-426614174002';

/** Returns a YYYY-MM-DD date `days` from now so GameSchema's "not in the past" rule holds. */
function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

const ORIGINAL_DATE = futureDate(14);
const RESCHEDULED_DATE = futureDate(21);

type RsvpRow = {
  status: 'confirmed' | 'declined' | 'waitlist';
  players: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
};

const CONFIRMED_RSVP: RsvpRow = {
  status: 'confirmed',
  players: {
    id: '323e4567-e89b-12d3-a456-426614174001',
    first_name: 'Eric',
    last_name: 'Posen',
    email: 'confirmed@example.com',
  },
};

const WAITLIST_RSVP: RsvpRow = {
  status: 'waitlist',
  players: {
    id: '323e4567-e89b-12d3-a456-426614174002',
    first_name: 'Jason',
    last_name: 'Fahn',
    email: 'waitlisted@example.com',
  },
};

const DECLINED_RSVP: RsvpRow = {
  status: 'declined',
  players: {
    id: '323e4567-e89b-12d3-a456-426614174003',
    first_name: 'Sam',
    last_name: 'Torres',
    email: 'declined@example.com',
  },
};

const BUMPED_SEQUENCE = 7;

/**
 * Builds a Supabase mock covering the reads, the write, and the sequence RPC that
 * updateGame performs. Returned jest mocks double as the assertion surface.
 */
function setupSupabase({
  rsvps = [] as RsvpRow[],
  calendarSequence = 0,
  oldNotes = null as string | null,
  gameUpdateError = null as { message: string } | null,
  rsvpQueryError = null as { message: string } | null,
  gameFetchError = null as { message: string } | null,
} = {}) {
  const oldGame = {
    id: GAME_ID,
    date: ORIGINAL_DATE,
    time: '19:00',
    buyIn: 100,
    location_id: OLD_LOCATION_ID,
    venue: 'Old Room',
    status: 'upcoming',
    notes: oldNotes,
    calendar_sequence: calendarSequence,
    locations: { id: OLD_LOCATION_ID, name: 'Old Room', address: '1 Old St' },
  };

  const newLocation = { id: NEW_LOCATION_ID, name: 'New Room', address: '2 New Ave' };

  const rsvpStatusFilter: { value: string[] | null } = { value: null };

  // Mirrors Postgres RETURNING: the row the caller reads back is the row as
  // written, not a hand-assembled copy.
  const updateGameRow = jest.fn((payload: Record<string, unknown>) => ({
    eq: jest.fn(() => ({
      select: jest.fn(() => ({
        maybeSingle: jest.fn().mockResolvedValue({
          data: gameUpdateError ? null : { ...oldGame, ...payload },
          error: gameUpdateError,
        }),
      })),
    })),
  }));

  const rpc = jest.fn().mockResolvedValue({ data: BUMPED_SEQUENCE, error: null });

  const supabase = {
    rpc,
    from: jest.fn((table: string) => {
      if (table === 'games') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: gameFetchError ? null : oldGame,
            error: gameFetchError,
          }),
          update: updateGameRow,
        };
      }

      if (table === 'locations') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: newLocation, error: null }),
        };
      }

      if (table === 'rsvps') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          // Honour the filter the way Postgres would. A fake that returned every
          // fixture row regardless would let the original bug (querying only
          // 'confirmed') pass every recipient assertion in this file.
          in: jest.fn((_column: string, values: string[]) => {
            rsvpStatusFilter.value = values;
            return Promise.resolve({
              data: rsvpQueryError ? null : rsvps.filter((r) => values.includes(r.status)),
              error: rsvpQueryError,
            });
          }),
        };
      }

      return {};
    }),
  };

  mockCreateSupabaseServerClient.mockResolvedValue(supabase as never);

  return { updateGameRow, rpc, rsvpStatusFilter };
}

/** Runs every callback `after()` captured, so background effects are observable. */
async function drainAfter(): Promise<void> {
  for (const [callback] of mockAfter.mock.calls) {
    await callback();
  }
}

type GameData = Parameters<typeof updateGame>[1];

/** Reschedules the game to a later date, then drains the background email job. */
async function reschedule(overrides: Partial<GameData> = {}) {
  const result = await updateGame(GAME_ID, {
    date: RESCHEDULED_DATE,
    time: '19:00',
    buyIn: 100,
    location_id: OLD_LOCATION_ID,
    notes: '',
    ...overrides,
  });

  await drainAfter();
  return result;
}

function recipients(): string[] {
  return mockSendEmail.mock.calls.map((call) => call[0].to as string);
}

function emailTo(address: string) {
  return mockSendEmail.mock.calls.find((call) => call[0].to === address)?.[0];
}

describe('P1.6: Game Update Notifications (Important)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@example.com' } as never);
    mockShouldSendNotification.mockResolvedValue(true);
    mockCreateEmailActionToken.mockResolvedValue({
      success: true,
      url: 'https://example.com/cancel',
    } as never);
    mockSendEmail.mockResolvedValue({ success: true });
    mockCreateEvent.mockReturnValue({ error: null, value: 'MOCK_ICS_CONTENT' } as never);
    // The inter-recipient rate-limit pause would otherwise make each multi-player
    // test wait a real second per extra player.
    jest.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void) => {
      callback();
      return 0 as unknown as NodeJS.Timeout;
    }) as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Recipients', () => {
    test('emails waitlisted players as well as confirmed players when a game is rescheduled', async () => {
      const { rsvpStatusFilter } = setupSupabase({ rsvps: [CONFIRMED_RSVP, WAITLIST_RSVP] });

      const result = await reschedule();

      expect(result).toEqual({ success: true });
      expect(rsvpStatusFilter.value).toEqual(['confirmed', 'waitlist']);
      expect(recipients()).toEqual(
        expect.arrayContaining(['confirmed@example.com', 'waitlisted@example.com'])
      );
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
    });

    test('never emails players who declined', async () => {
      setupSupabase({ rsvps: [CONFIRMED_RSVP, WAITLIST_RSVP, DECLINED_RSVP] });

      await reschedule();

      expect(recipients()).not.toContain('declined@example.com');
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
    });

    test('skips players who have turned off game update notifications', async () => {
      setupSupabase({ rsvps: [CONFIRMED_RSVP, WAITLIST_RSVP] });
      mockShouldSendNotification.mockImplementation(
        async (email) => email !== 'waitlisted@example.com'
      );

      await reschedule();

      expect(mockShouldSendNotification).toHaveBeenCalledWith(
        'waitlisted@example.com',
        'game_updated'
      );
      expect(recipients()).toEqual(['confirmed@example.com']);
    });

    test('does nothing when the game has no RSVPs', async () => {
      setupSupabase({ rsvps: [] });

      const result = await reschedule();

      expect(result).toEqual({ success: true });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe('Calendar invite', () => {
    test('attaches the updated calendar invite for confirmed players only', async () => {
      setupSupabase({ rsvps: [CONFIRMED_RSVP, WAITLIST_RSVP] });

      await reschedule();

      expect(emailTo('confirmed@example.com')?.icsContent).toBe('MOCK_ICS_CONTENT');
      expect(emailTo('waitlisted@example.com')?.icsContent).toBeUndefined();
    });

    test('tells waitlisted players their calendar was not updated', async () => {
      setupSupabase({ rsvps: [CONFIRMED_RSVP, WAITLIST_RSVP] });

      await reschedule();

      const confirmedBody = renderToStaticMarkup(emailTo('confirmed@example.com')!.react);
      const waitlistBody = renderToStaticMarkup(emailTo('waitlisted@example.com')!.react);

      expect(confirmedBody).toContain('Your calendar has been updated automatically');
      expect(confirmedBody).toContain('Cancel my RSVP');
      expect(waitlistBody).not.toContain('Your calendar has been updated automatically');
      expect(waitlistBody).toContain('still on the waitlist');
      expect(waitlistBody).toContain('Leave the waitlist');
    });

    test('stamps the invite with an atomically reserved sequence so it supersedes the last one', async () => {
      const { rpc } = setupSupabase({ rsvps: [CONFIRMED_RSVP], calendarSequence: 6 });

      await reschedule();

      expect(rpc).toHaveBeenCalledWith('next_game_calendar_sequence', { p_game_id: GAME_ID });
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({ sequence: BUMPED_SEQUENCE })
      );
    });

    test('generates the invite from the new date, time and location', async () => {
      setupSupabase({ rsvps: [CONFIRMED_RSVP] });

      await reschedule({ time: '20:30', location_id: NEW_LOCATION_ID });

      const [year, month, day] = RESCHEDULED_DATE.split('-').map(Number);
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          start: [year, month, day, 20, 30],
          title: 'Poker Night at New Room',
          location: '2 New Ave',
        })
      );
    });
  });

  describe('Change detection', () => {
    test('sends nothing when an edit changes no details', async () => {
      setupSupabase({ rsvps: [CONFIRMED_RSVP] });

      // Same date/time/buy-in/location, and empty notes against a NULL notes column.
      const result = await updateGame(GAME_ID, {
        date: ORIGINAL_DATE,
        time: '19:00',
        buyIn: 100,
        location_id: OLD_LOCATION_ID,
        notes: '',
      });
      await drainAfter();

      expect(result).toEqual({ success: true });
      expect(mockAfter).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    test('notifies when only the notes changed', async () => {
      setupSupabase({ rsvps: [CONFIRMED_RSVP], oldNotes: 'Bring cash' });

      await reschedule({ date: ORIGINAL_DATE, notes: 'Bring cash and chips' });

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(renderToStaticMarkup(emailTo('confirmed@example.com')!.react)).toContain(
        'Notes updated'
      );
    });

    test('notifies when only the buy-in changed', async () => {
      setupSupabase({ rsvps: [CONFIRMED_RSVP] });

      await reschedule({ date: ORIGINAL_DATE, buyIn: 150 });

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(renderToStaticMarkup(emailTo('confirmed@example.com')!.react)).toContain(
        'Buy-in changed'
      );
    });
  });

  describe('Failure handling', () => {
    test('does not block the update on email delivery', async () => {
      setupSupabase({ rsvps: [CONFIRMED_RSVP, WAITLIST_RSVP] });

      // Deliberately does NOT drain the after() queue — the point is that the
      // action returns before any email work begins. Do not swap in reschedule().
      const result = await updateGame(GAME_ID, {
        date: RESCHEDULED_DATE,
        time: '19:00',
        buyIn: 100,
        location_id: OLD_LOCATION_ID,
        notes: '',
      });

      expect(result).toEqual({ success: true });
      expect(mockAfter).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    test('emails nobody when the game write fails', async () => {
      setupSupabase({ rsvps: [CONFIRMED_RSVP], gameUpdateError: { message: 'write conflict' } });

      const result = await reschedule();

      expect(result).toEqual({ error: 'Failed to update game. Please try again.' });
      expect(mockAfter).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    test('refuses to write the game when its current details cannot be read', async () => {
      const { updateGameRow } = setupSupabase({
        rsvps: [CONFIRMED_RSVP],
        gameFetchError: { message: 'connection reset' },
      });

      const result = await reschedule();

      expect(result).toEqual({
        error: 'Could not load the current game details, so nothing was changed. Please try again.',
      });
      expect(updateGameRow).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    test('still reports success when the RSVP lookup fails, but emails no one', async () => {
      setupSupabase({
        rsvps: [CONFIRMED_RSVP],
        rsvpQueryError: { message: 'statement timeout' },
      });

      const result = await reschedule();

      // The game really was rescheduled; only the notification leg failed.
      expect(result).toEqual({ success: true });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    test('keeps notifying the remaining players after one send fails', async () => {
      setupSupabase({ rsvps: [CONFIRMED_RSVP, WAITLIST_RSVP] });
      mockSendEmail.mockResolvedValueOnce({ success: false, error: 'invalid recipient' });

      await reschedule();

      expect(recipients()).toEqual(
        expect.arrayContaining(['confirmed@example.com', 'waitlisted@example.com'])
      );
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
    });

    test('still sends the email when the one-click cancel token cannot be minted', async () => {
      setupSupabase({ rsvps: [CONFIRMED_RSVP] });
      mockCreateEmailActionToken.mockResolvedValue({
        success: false,
        error: 'insert denied',
      } as never);

      await reschedule();

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      const body = renderToStaticMarkup(emailTo('confirmed@example.com')!.react);
      expect(body).toContain('View Game Details');
      expect(body).not.toContain('https://example.com/cancel');
    });
  });
});
