/**
 * P0 CRITICAL TESTS: RSVP Auto-Promotion
 *
 * Why Critical: Seat management integrity - ensures waitlist players are automatically
 * promoted when confirmed players cancel. Bugs here could lead to:
 * - Unfilled seats when waitlist players are available
 * - Wrong player promoted (breaking fairness)
 * - Race conditions with concurrent cancellations
 * - Missing notifications to promoted players
 *
 * Priority: P0.2
 * Estimated Tests: 8
 */

import { cancelRSVP } from '@/app/game/[id]/actions'
import { createSupabaseServerClient } from '@/lib/auth-helpers'
import { sendEmail } from '@/lib/email/send-email'
import { shouldSendNotification } from '@/lib/email/check-preferences'
import { generateGameIcs } from '@/lib/email/generate-ics'

// Mock dependencies
jest.mock('@/lib/auth-helpers', () => ({
  createSupabaseServerClient: jest.fn(),
  requireAdmin: jest.fn(),
  handleServerError: jest.fn((error: any, code?: string, message?: string) => {
    if (error instanceof Error) {
      return { error: message || error.message }
    }
    return { error: message || 'An error occurred' }
  }),
}))
jest.mock('@/lib/email/send-email')
jest.mock('@/lib/email/check-preferences')
jest.mock('@/lib/email/generate-ics')
// Stubbed so reserving an .ics sequence doesn't add rpc() calls — this suite
// asserts on rpc() to verify waitlist promotion specifically.
const RESERVED_SEQUENCE = 4
jest.mock('@/lib/email/calendar-sequence', () => ({
  nextCalendarSequence: jest.fn().mockResolvedValue(4),
}))
jest.mock('@/lib/email/action-tokens', () => ({
  createEmailActionToken: jest.fn().mockResolvedValue({ success: true, url: 'https://test.com/action' }),
}))
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const mockCreateSupabaseServerClient = createSupabaseServerClient as jest.MockedFunction<
  typeof createSupabaseServerClient
>
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>
const mockShouldSendNotification = shouldSendNotification as jest.MockedFunction<typeof shouldSendNotification>
const mockGenerateGameIcs = generateGameIcs as jest.MockedFunction<typeof generateGameIcs>

describe('P0.2: RSVP Auto-Promotion (Critical)', () => {
  let mockSupabase: any

  // Use proper UUIDs for testing
  const GAME_ID = '323e4567-e89b-12d3-a456-426614174001'
  const CONFIRMED_PLAYER_ID = '123e4567-e89b-12d3-a456-426614174001'
  const WAITLIST_PLAYER_1_ID = '123e4567-e89b-12d3-a456-426614174002'
  const WAITLIST_PLAYER_2_ID = '123e4567-e89b-12d3-a456-426614174003'
  const ADMIN_USER_ID = 'admin-123e4567-e89b-12d3-a456-426614174001'
  const PROMOTED_RSVP_ID = '523e4567-e89b-12d3-a456-426614174001'

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock email functions to always allow emails
    mockShouldSendNotification.mockResolvedValue(true)
    mockGenerateGameIcs.mockReturnValue('MOCK_ICS_CONTENT')
    mockSendEmail.mockResolvedValue({ success: true })

    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn(),
      rpc: jest.fn(),
      auth: {
        getUser: jest.fn(),
      },
    }

    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabase)
  })

  describe('Basic promotion flow', () => {
    test('promotes first waitlist player when confirmed player cancels', async () => {
      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      const rsvp = {
        id: '423e4567-e89b-12d3-a456-426614174001',
        gameId: GAME_ID,
        playerId: CONFIRMED_PLAYER_ID,
        status: 'confirmed',
      }

      const game = {
        id: GAME_ID,
        date: '2025-01-20',
        time: '19:00',
        buyIn: 100,
        status: 'upcoming',
        locations: {
          id: 'loc-1',
          name: 'Test Location',
          address: '123 Test St',
        },
      }

      const player = {
        id: CONFIRMED_PLAYER_ID,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        notificationPreferences: {},
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: ADMIN_USER_ID }, error: null }),
          }
        }
        if (table === 'rsvps') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn((field: string) => {
              if (field === 'gameId') {
                return {
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                  })),
                  single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                }
              }
              if (field === 'id') {
                return {
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: PROMOTED_RSVP_ID,
                      playerId: WAITLIST_PLAYER_1_ID,
                      status: 'confirmed',
                      players: {
                        id: WAITLIST_PLAYER_1_ID,
                        firstName: 'Jane',
                        lastName: 'Smith',
                        email: 'jane@test.com',
                        notificationPreferences: {},
                      },
                    },
                    error: null,
                  }),
                }
              }
              return this
            }),
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            single: jest.fn(),
          }
        }
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: game, error: null }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: player, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      // Mock RPC to simulate promotion
      mockSupabase.rpc.mockResolvedValue({ data: PROMOTED_RSVP_ID, error: null })

      const result = await cancelRSVP(GAME_ID, CONFIRMED_PLAYER_ID)

      // Verify RPC was called to promote next waitlist player
      expect(mockSupabase.rpc).toHaveBeenCalledWith('promote_next_waitlist_player', {
        p_game_id: GAME_ID,
      })

      expect(result).toEqual({ success: true })
    })

    test('does not promote if no waitlist players exist', async () => {
      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      const rsvp = {
        id: '423e4567-e89b-12d3-a456-426614174001',
        gameId: GAME_ID,
        playerId: CONFIRMED_PLAYER_ID,
        status: 'confirmed',
      }

      const game = {
        id: GAME_ID,
        date: '2025-01-20',
        time: '19:00',
        buyIn: 100,
        status: 'upcoming',
        locations: {
          id: 'loc-1',
          name: 'Test Location',
          address: '123 Test St',
        },
      }

      const player = {
        id: CONFIRMED_PLAYER_ID,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        notificationPreferences: {},
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: ADMIN_USER_ID }, error: null }),
          }
        }
        if (table === 'rsvps') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn((field: string) => {
              if (field === 'gameId') {
                return {
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                  })),
                  single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                }
              }
              return this
            }),
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            single: jest.fn(),
          }
        }
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: game, error: null }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: player, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      // Mock RPC to return null (no waitlist players)
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null })

      const result = await cancelRSVP(GAME_ID, CONFIRMED_PLAYER_ID)

      // Verify RPC was called
      expect(mockSupabase.rpc).toHaveBeenCalledWith('promote_next_waitlist_player', {
        p_game_id: GAME_ID,
      })

      // Verify no promotion email was sent
      expect(mockSendEmail).toHaveBeenCalledTimes(1) // Only cancellation email, no promotion email

      expect(result).toEqual({ success: true })
    })

    test('does not promote when waitlist player cancels', async () => {
      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      const rsvp = {
        id: '523e4567-e89b-12d3-a456-426614174001',
        gameId: GAME_ID,
        playerId: WAITLIST_PLAYER_1_ID,
        status: 'waitlist', // Waitlist player, not confirmed
        waitlistPosition: 1,
      }

      const game = {
        id: GAME_ID,
        date: '2025-01-20',
        time: '19:00',
        buyIn: 100,
        status: 'upcoming',
        locations: {
          id: 'loc-1',
          name: 'Test Location',
          address: '123 Test St',
        },
      }

      const player = {
        id: WAITLIST_PLAYER_1_ID,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
        notificationPreferences: {},
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: ADMIN_USER_ID }, error: null }),
          }
        }
        if (table === 'rsvps') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn((field: string) => {
              if (field === 'gameId') {
                return {
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                  })),
                  single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                }
              }
              return this
            }),
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            single: jest.fn(),
          }
        }
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: game, error: null }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: player, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      const result = await cancelRSVP(GAME_ID, WAITLIST_PLAYER_1_ID)

      // Verify RPC was NOT called (only confirmed cancellations trigger promotion)
      expect(mockSupabase.rpc).not.toHaveBeenCalled()

      expect(result).toEqual({ success: true })
    })
  })

  describe('Promotion notifications', () => {
    test('sends waitlist promotion email to promoted player', async () => {
      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      const rsvp = {
        id: '423e4567-e89b-12d3-a456-426614174001',
        gameId: GAME_ID,
        playerId: CONFIRMED_PLAYER_ID,
        status: 'confirmed',
      }

      const game = {
        id: GAME_ID,
        date: '2025-01-20',
        time: '19:00',
        buyIn: 100,
        status: 'upcoming',
        locations: {
          id: 'loc-1',
          name: 'Test Location',
          address: '123 Test St',
        },
      }

      const player = {
        id: CONFIRMED_PLAYER_ID,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        notificationPreferences: {},
      }

      const promotedPlayer = {
        id: WAITLIST_PLAYER_1_ID,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
        notificationPreferences: {},
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: ADMIN_USER_ID }, error: null }),
          }
        }
        if (table === 'rsvps') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn((field: string) => {
              if (field === 'gameId') {
                return {
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                  })),
                  single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                }
              }
              if (field === 'id') {
                return {
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: PROMOTED_RSVP_ID,
                      playerId: WAITLIST_PLAYER_1_ID,
                      status: 'confirmed',
                      players: promotedPlayer,
                    },
                    error: null,
                  }),
                }
              }
              return this
            }),
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            single: jest.fn(),
          }
        }
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: game, error: null }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: player, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      // Mock RPC to simulate promotion
      mockSupabase.rpc.mockResolvedValue({ data: PROMOTED_RSVP_ID, error: null })

      await cancelRSVP(GAME_ID, CONFIRMED_PLAYER_ID)

      // Verify waitlist promotion email was sent
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@test.com',
          subject: expect.stringContaining("You're In!"),
        })
      )
    })

    test('includes calendar invite in promotion email', async () => {
      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      const rsvp = {
        id: '423e4567-e89b-12d3-a456-426614174001',
        gameId: GAME_ID,
        playerId: CONFIRMED_PLAYER_ID,
        status: 'confirmed',
      }

      const game = {
        id: GAME_ID,
        date: '2025-01-20',
        time: '19:00',
        buyIn: 100,
        status: 'upcoming',
        locations: {
          id: 'loc-1',
          name: 'Test Location',
          address: '123 Test St',
        },
      }

      const player = {
        id: CONFIRMED_PLAYER_ID,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        notificationPreferences: {},
      }

      const promotedPlayer = {
        id: WAITLIST_PLAYER_1_ID,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
        notificationPreferences: {},
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: ADMIN_USER_ID }, error: null }),
          }
        }
        if (table === 'rsvps') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn((field: string) => {
              if (field === 'gameId') {
                return {
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                  })),
                  single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                }
              }
              if (field === 'id') {
                return {
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: PROMOTED_RSVP_ID,
                      playerId: WAITLIST_PLAYER_1_ID,
                      status: 'confirmed',
                      players: promotedPlayer,
                    },
                    error: null,
                  }),
                }
              }
              return this
            }),
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            single: jest.fn(),
          }
        }
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: game, error: null }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: player, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      // Mock RPC to simulate promotion
      mockSupabase.rpc.mockResolvedValue({ data: PROMOTED_RSVP_ID, error: null })

      await cancelRSVP(GAME_ID, CONFIRMED_PLAYER_ID)

      // Verify calendar ICS was generated. The sequence must come from the
      // per-game counter, not a constant, or the promoted player's calendar
      // ignores the invite once the game has been rescheduled.
      expect(mockGenerateGameIcs).toHaveBeenCalledWith(
        expect.objectContaining({
          playerEmail: 'jane@test.com',
          status: 'CONFIRMED',
          sequence: RESERVED_SEQUENCE,
        })
      )

      // Verify email includes ICS content
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          icsContent: 'MOCK_ICS_CONTENT',
        })
      )
    })

    test('respects notification preferences for promotion email', async () => {
      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      const rsvp = {
        id: '423e4567-e89b-12d3-a456-426614174001',
        gameId: GAME_ID,
        playerId: CONFIRMED_PLAYER_ID,
        status: 'confirmed',
      }

      const game = {
        id: GAME_ID,
        date: '2025-01-20',
        time: '19:00',
        buyIn: 100,
        status: 'upcoming',
        locations: {
          id: 'loc-1',
          name: 'Test Location',
          address: '123 Test St',
        },
      }

      const player = {
        id: CONFIRMED_PLAYER_ID,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        notificationPreferences: {},
      }

      const promotedPlayer = {
        id: WAITLIST_PLAYER_1_ID,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
        notificationPreferences: {},
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: ADMIN_USER_ID }, error: null }),
          }
        }
        if (table === 'rsvps') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn((field: string) => {
              if (field === 'gameId') {
                return {
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                  })),
                  single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                }
              }
              if (field === 'id') {
                return {
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: PROMOTED_RSVP_ID,
                      playerId: WAITLIST_PLAYER_1_ID,
                      status: 'confirmed',
                      players: promotedPlayer,
                    },
                    error: null,
                  }),
                }
              }
              return this
            }),
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            single: jest.fn(),
          }
        }
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: game, error: null }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: player, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      // Mock RPC to simulate promotion
      mockSupabase.rpc.mockResolvedValue({ data: PROMOTED_RSVP_ID, error: null })

      // Mock notification preference check to return false (emails disabled)
      mockShouldSendNotification.mockResolvedValue(false)

      await cancelRSVP(GAME_ID, CONFIRMED_PLAYER_ID)

      // Verify shouldSendNotification was called with correct params
      expect(mockShouldSendNotification).toHaveBeenCalledWith('jane@test.com', 'waitlist_promoted')

      // Verify no promotion email was sent (due to preference)
      const promotionEmailCalls = mockSendEmail.mock.calls.filter((call) =>
        call[0].subject.includes("You're In!")
      )
      expect(promotionEmailCalls.length).toBe(0)
    })
  })

  describe('Edge cases', () => {
    test('handles promotion when promoted player has no email', async () => {
      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      const rsvp = {
        id: '423e4567-e89b-12d3-a456-426614174001',
        gameId: GAME_ID,
        playerId: CONFIRMED_PLAYER_ID,
        status: 'confirmed',
      }

      const game = {
        id: GAME_ID,
        date: '2025-01-20',
        time: '19:00',
        buyIn: 100,
        status: 'upcoming',
        locations: {
          id: 'loc-1',
          name: 'Test Location',
          address: '123 Test St',
        },
      }

      const player = {
        id: CONFIRMED_PLAYER_ID,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        notificationPreferences: {},
      }

      const promotedPlayer = {
        id: WAITLIST_PLAYER_1_ID,
        firstName: 'Jane',
        lastName: 'Smith',
        email: null, // No email
        notificationPreferences: {},
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: ADMIN_USER_ID }, error: null }),
          }
        }
        if (table === 'rsvps') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn((field: string) => {
              if (field === 'gameId') {
                return {
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                  })),
                  single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                }
              }
              if (field === 'id') {
                return {
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: PROMOTED_RSVP_ID,
                      playerId: WAITLIST_PLAYER_1_ID,
                      status: 'confirmed',
                      players: promotedPlayer,
                    },
                    error: null,
                  }),
                }
              }
              return this
            }),
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            single: jest.fn(),
          }
        }
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: game, error: null }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: player, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      // Mock RPC to simulate promotion
      mockSupabase.rpc.mockResolvedValue({ data: PROMOTED_RSVP_ID, error: null })

      const result = await cancelRSVP(GAME_ID, CONFIRMED_PLAYER_ID)

      // Verify promotion succeeded even without email
      expect(result).toEqual({ success: true })

      // Verify no promotion email was sent (no email address)
      const promotionEmailCalls = mockSendEmail.mock.calls.filter((call) =>
        call[0].subject.includes("You're In!")
      )
      expect(promotionEmailCalls.length).toBe(0)
    })

    test('handles database promotion failure gracefully', async () => {
      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      const rsvp = {
        id: '423e4567-e89b-12d3-a456-426614174001',
        gameId: GAME_ID,
        playerId: CONFIRMED_PLAYER_ID,
        status: 'confirmed',
      }

      const game = {
        id: GAME_ID,
        date: '2025-01-20',
        time: '19:00',
        buyIn: 100,
        status: 'upcoming',
        locations: {
          id: 'loc-1',
          name: 'Test Location',
          address: '123 Test St',
        },
      }

      const player = {
        id: CONFIRMED_PLAYER_ID,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        notificationPreferences: {},
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: ADMIN_USER_ID }, error: null }),
          }
        }
        if (table === 'rsvps') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn((field: string) => {
              if (field === 'gameId') {
                return {
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                  })),
                  single: jest.fn().mockResolvedValue({ data: rsvp, error: null }),
                }
              }
              return this
            }),
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            single: jest.fn(),
          }
        }
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: game, error: null }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: player, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      // Mock RPC to simulate database error
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const result = await cancelRSVP(GAME_ID, CONFIRMED_PLAYER_ID)

      // Verify cancellation still succeeded (promotion failure shouldn't block cancellation)
      expect(result).toEqual({ success: true })
    })
  })
})
