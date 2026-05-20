import { createGame } from '@/app/actions';
import { createSupabaseServerClient, requireAdmin } from '@/lib/auth-helpers';
import { sendEmail } from '@/lib/email/send-email';
import { createEmailActionToken } from '@/lib/email/action-tokens';

let scheduledAfterCallback: (() => Promise<void> | void) | null = null;
const mockAfter = jest.fn((callback: () => Promise<void> | void) => {
  scheduledAfterCallback = callback;
});

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

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

jest.mock('@/lib/email/action-tokens', () => ({
  createEmailActionToken: jest.fn().mockResolvedValue({ success: true, url: 'https://example.com/rsvp' }),
}));

const mockCreateSupabaseServerClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>;
const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockCreateEmailActionToken = createEmailActionToken as jest.MockedFunction<typeof createEmailActionToken>;

// Use a date 30 days in the future so the test stays valid as time passes.
// Formatted YYYY-MM-DD in local time to match how GameSchema parses dates.
function futureGameDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('createGame', () => {
  const GAME_DATE = futureGameDate();

  beforeEach(() => {
    jest.clearAllMocks();
    scheduledAfterCallback = null;

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'locations') {
          const query = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { name: 'Poker Room', address: '123 Main St' },
              error: null,
            }),
          };

          return query;
        }

        if (table === 'games') {
          const query = {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'game-123',
                date: GAME_DATE,
                time: '19:00',
                buyIn: 100,
                location_id: '223e4567-e89b-12d3-a456-426614174001',
                notes: 'Bring chips',
              },
              error: null,
            }),
          };

          return query;
        }

        if (table === 'players') {
          const query = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            not: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'player-1',
                  email: 'player@example.com',
                },
              ],
              error: null,
            }),
          };

          return query;
        }

        return {};
      }),
    };

    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabase as never);
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@example.com' } as never);
  });

  it('returns success and schedules notifications after creating the game', async () => {
    const result = await createGame({
      date: GAME_DATE,
      time: '19:00',
      buyIn: 100,
      location_id: '223e4567-e89b-12d3-a456-426614174001',
      notes: 'Bring chips',
    });

    expect(result).toEqual({
      success: true,
      data: {
        id: 'game-123',
        date: GAME_DATE,
        time: '19:00',
        buyIn: 100,
        location_id: '223e4567-e89b-12d3-a456-426614174001',
        notes: 'Bring chips',
      },
    });
    expect(mockAfter).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).not.toHaveBeenCalled();

    await scheduledAfterCallback?.();

    expect(mockCreateEmailActionToken).toHaveBeenCalledWith({
      gameId: 'game-123',
      playerId: 'player-1',
      action: 'rsvp',
    });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });
});
