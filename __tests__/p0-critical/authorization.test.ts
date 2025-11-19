/**
 * P0 CRITICAL TESTS: Authorization
 *
 * Why Critical: Security and access control - ensures users can only perform
 * actions they're authorized for. Bugs here could lead to:
 * - Unauthorized game modifications
 * - Users RSVPing as other players
 * - Non-admins accessing admin functions
 * - Data integrity violations
 *
 * Priority: P0.4
 * Estimated Tests: 6
 */

import { addRSVP, cancelRSVP, deleteGame } from '@/app/game/[id]/actions'
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers'

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
jest.mock('@/lib/email/action-tokens', () => ({
  createEmailActionToken: jest.fn().mockResolvedValue({ success: true, url: 'https://test.com/action' }),
}))
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const mockCreateSupabaseServerClient = createSupabaseServerClient as jest.MockedFunction<
  typeof createSupabaseServerClient
>
const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>

describe('P0.4: Authorization (Critical)', () => {
  let mockSupabase: any

  // Use proper UUIDs for testing
  const GAME_ID = '323e4567-e89b-12d3-a456-426614174001'
  const PLAYER_1_ID = '123e4567-e89b-12d3-a456-426614174001'
  const PLAYER_2_ID = '123e4567-e89b-12d3-a456-426614174002'
  const ADMIN_USER_ID = 'admin-123e4567-e89b-12d3-a456-426614174001'
  const REGULAR_USER_ID = 'user-123e4567-e89b-12d3-a456-426614174001'

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn(),
      auth: {
        getSession: jest.fn(),
      },
    }

    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabase)
  })

  describe('Unauthenticated access', () => {
    test('rejects RSVP from unauthenticated user', async () => {
      // Setup: No session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      })

      const result = await addRSVP(GAME_ID, PLAYER_1_ID)

      expect(result).toEqual({ error: 'Unauthorized: Please sign in' })
    })

    test('rejects RSVP cancellation from unauthenticated user', async () => {
      // Setup: No session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      })

      const result = await cancelRSVP(GAME_ID, PLAYER_1_ID)

      expect(result).toEqual({ error: 'Unauthorized: Please sign in' })
    })
  })

  describe('Non-admin user restrictions', () => {
    test('allows users to RSVP for themselves only', async () => {
      // Setup: Regular user session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: REGULAR_USER_ID, email: 'user@test.com' }
          }
        },
      })

      // Setup: User trying to RSVP for themselves
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_users') {
          // Not an admin
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: PLAYER_1_ID,
                email: 'user@test.com', // Same email as session
              },
              error: null,
            }),
          }
        }
        if (table === 'rsvps') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
              .mockImplementation((field: string) => {
                if (field === 'gameId') {
                  return Promise.resolve({ data: [], error: null })
                }
                return {
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({ data: null, error: null }),
                  })),
                }
              }),
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: GAME_ID,
                date: '2025-01-20',
                time: '19:00',
                buyIn: 100,
                locations: { id: 'loc-1', name: 'Test Location', address: '123 Test St' },
              },
              error: null,
            }),
          }
        }
        return { select: jest.fn() }
      })

      const result = await addRSVP(GAME_ID, PLAYER_1_ID)

      expect(result).toEqual({ success: true })
    })

    test('rejects users RSVPing for other players', async () => {
      // Setup: Regular user session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: REGULAR_USER_ID, email: 'user@test.com' }
          }
        },
      })

      // Setup: User trying to RSVP for different player
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_users') {
          // Not an admin
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: PLAYER_2_ID,
                email: 'otherplayer@test.com', // Different email
              },
              error: null,
            }),
          }
        }
        return { select: jest.fn() }
      })

      const result = await addRSVP(GAME_ID, PLAYER_2_ID)

      expect(result).toEqual({ error: 'Unauthorized: You can only RSVP for yourself' })
    })

    test('allows users to cancel only their own RSVP', async () => {
      // Setup: Regular user session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: REGULAR_USER_ID, email: 'user@test.com' }
          }
        },
      })

      // Setup: User trying to cancel their own RSVP
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_users') {
          // Not an admin
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: PLAYER_1_ID,
                email: 'user@test.com', // Same email as session
              },
              error: null,
            }),
          }
        }
        if (table === 'rsvps') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn((field: string) => {
              if (field === 'gameId') {
                return {
                  eq: jest.fn(() => ({
                    single: jest.fn().mockResolvedValue({
                      data: { id: 'rsvp-1', gameId: GAME_ID, playerId: PLAYER_1_ID, status: 'confirmed' },
                      error: null,
                    }),
                  })),
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'rsvp-1', gameId: GAME_ID, playerId: PLAYER_1_ID, status: 'confirmed' },
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
          }
        }
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: GAME_ID,
                date: '2025-01-20',
                time: '19:00',
                buyIn: 100,
                locations: { id: 'loc-1', name: 'Test Location', address: '123 Test St' },
              },
              error: null,
            }),
          }
        }
        return { select: jest.fn() }
      })

      // Mock RPC to return null (no waitlist)
      mockSupabase.rpc = jest.fn().mockResolvedValue({ data: null, error: null })

      const result = await cancelRSVP(GAME_ID, PLAYER_1_ID)

      expect(result).toEqual({ success: true })
    })

    test('rejects users canceling other players RSVPs', async () => {
      // Setup: Regular user session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: REGULAR_USER_ID, email: 'user@test.com' }
          }
        },
      })

      // Setup: User trying to cancel different player's RSVP
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_users') {
          // Not an admin
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: PLAYER_2_ID,
                email: 'otherplayer@test.com', // Different email
              },
              error: null,
            }),
          }
        }
        return { select: jest.fn() }
      })

      const result = await cancelRSVP(GAME_ID, PLAYER_2_ID)

      expect(result).toEqual({ error: 'Unauthorized: You can only cancel your own RSVP' })
    })
  })

  describe('Admin access', () => {
    test('allows admins to delete games', async () => {
      // Setup: Admin session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: ADMIN_USER_ID, email: 'admin@test.com' }
          }
        },
      })

      // Mock requireAdmin to succeed
      mockRequireAdmin.mockResolvedValue({
        id: ADMIN_USER_ID,
        email: 'admin@test.com',
      } as any)

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: GAME_ID,
                date: '2025-01-20',
                time: '19:00',
                locations: { id: 'loc-1', name: 'Test Location', address: '123 Test St' },
              },
              error: null,
            }),
            delete: jest.fn().mockReturnThis(),
          }
        }
        if (table === 'rsvps') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            })),
          }
        }
        return { select: jest.fn() }
      })

      const result = await deleteGame(GAME_ID)

      expect(result).toEqual({ success: true })
      expect(mockRequireAdmin).toHaveBeenCalledWith(mockSupabase)
    })
  })
})
