/**
 * P0 CRITICAL TESTS: RSVP Seat Limit
 *
 * Why Critical: Game capacity management - ensures the 8-seat limit is enforced
 * and waitlist assignment works correctly. Bugs here could lead to:
 * - Overcrowded games (more than 8 confirmed players)
 * - Lost RSVPs (not added to waitlist when game is full)
 * - Incorrect waitlist positions
 * - Unfair seat allocation
 *
 * Priority: P0.3
 * Estimated Tests: 7
 */

import { addRSVP } from '@/app/game/[id]/actions'
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers'
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

describe('P0.3: RSVP Seat Limit (Critical)', () => {
  let mockSupabase: any

  // Use proper UUIDs for testing
  const GAME_ID = '323e4567-e89b-12d3-a456-426614174001'
  const ADMIN_USER_ID = 'admin-123e4567-e89b-12d3-a456-426614174001'

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock email functions to always allow emails
    mockShouldSendNotification.mockResolvedValue(true)
    mockGenerateGameIcs.mockReturnValue('MOCK_ICS_CONTENT')
    mockSendEmail.mockResolvedValue({ success: true })

    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn(),
      auth: {
        getUser: jest.fn(),
      },
    }

    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabase)
  })

  describe('Confirmed seat allocation', () => {
    test('assigns confirmed status when fewer than 8 players', async () => {
      const playerId = '123e4567-e89b-12d3-a456-426614174001'

      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      // Setup: 5 existing confirmed RSVPs
      const existingRsvps = Array.from({ length: 5 }, (_, i) => ({
        id: `rsvp-${i}`,
        gameId: GAME_ID,
        playerId: `player-${i}`,
        status: 'confirmed',
      }))

      let capturedRsvp: any = null

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
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            insert: jest.fn((data: any) => {
              capturedRsvp = data
              return Promise.resolve({ data: null, error: null })
            }),
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
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: playerId,
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@test.com',
              },
              error: null,
            }),
          }
        }
        return { select: jest.fn().mockResolvedValue({ data: existingRsvps, error: null }) }
      })

      const result = await addRSVP(GAME_ID, playerId)

      expect(result).toEqual({ success: true })
      expect(capturedRsvp.status).toBe('confirmed')
      expect(capturedRsvp.waitlistPosition).toBeNull()
    })

    test('assigns confirmed status for exactly 8th player', async () => {
      const playerId = '123e4567-e89b-12d3-a456-426614174001'

      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      // Setup: 7 existing confirmed RSVPs
      const existingRsvps = Array.from({ length: 7 }, (_, i) => ({
        id: `rsvp-${i}`,
        gameId: GAME_ID,
        playerId: `player-${i}`,
        status: 'confirmed',
      }))

      let capturedRsvp: any = null

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
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            insert: jest.fn((data: any) => {
              capturedRsvp = data
              return Promise.resolve({ data: null, error: null })
            }),
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
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: playerId,
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@test.com',
              },
              error: null,
            }),
          }
        }
        return { select: jest.fn().mockResolvedValue({ data: existingRsvps, error: null }) }
      })

      const result = await addRSVP(GAME_ID, playerId)

      expect(result).toEqual({ success: true })
      expect(capturedRsvp.status).toBe('confirmed')
      expect(capturedRsvp.waitlistPosition).toBeNull()
    })

    test('assigns waitlist status for 9th player', async () => {
      const playerId = '123e4567-e89b-12d3-a456-426614174001'

      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      // Setup: 8 existing confirmed RSVPs (game is full)
      const existingRsvps = Array.from({ length: 8 }, (_, i) => ({
        id: `rsvp-${i}`,
        gameId: GAME_ID,
        playerId: `player-${i}`,
        status: 'confirmed',
      }))

      let capturedRsvp: any = null

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
            eq: jest.fn().mockImplementation((field: string) => {
              if (field === 'gameId') {
                return Promise.resolve({ data: existingRsvps, error: null })
              }
              return {
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                })),
              }
            }),
            insert: jest.fn((data: any) => {
              capturedRsvp = data
              return Promise.resolve({ data: null, error: null })
            }),
          }
        }
        return { select: jest.fn() }
      })

      const result = await addRSVP(GAME_ID, playerId)

      expect(result).toEqual({ success: true })
      expect(capturedRsvp.status).toBe('waitlist')
      expect(capturedRsvp.waitlistPosition).toBe(1)
    })
  })

  describe('Waitlist position assignment', () => {
    test('assigns sequential waitlist positions', async () => {
      const playerId = '123e4567-e89b-12d3-a456-426614174001'

      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      // Setup: 8 confirmed + 2 waitlist RSVPs
      const existingRsvps = [
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `rsvp-confirmed-${i}`,
          gameId: GAME_ID,
          playerId: `player-confirmed-${i}`,
          status: 'confirmed',
        })),
        {
          id: 'rsvp-waitlist-1',
          gameId: GAME_ID,
          playerId: 'player-waitlist-1',
          status: 'waitlist',
          waitlistPosition: 1,
        },
        {
          id: 'rsvp-waitlist-2',
          gameId: GAME_ID,
          playerId: 'player-waitlist-2',
          status: 'waitlist',
          waitlistPosition: 2,
        },
      ]

      let capturedRsvp: any = null

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
            eq: jest.fn().mockImplementation((field: string) => {
              if (field === 'gameId') {
                return Promise.resolve({ data: existingRsvps, error: null })
              }
              return {
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                })),
              }
            }),
            insert: jest.fn((data: any) => {
              capturedRsvp = data
              return Promise.resolve({ data: null, error: null })
            }),
          }
        }
        return { select: jest.fn() }
      })

      const result = await addRSVP(GAME_ID, playerId)

      expect(result).toEqual({ success: true })
      expect(capturedRsvp.status).toBe('waitlist')
      expect(capturedRsvp.waitlistPosition).toBe(3) // Should be 3rd in waitlist
    })

    test('assigns position 1 for first waitlist player', async () => {
      const playerId = '123e4567-e89b-12d3-a456-426614174001'

      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      // Setup: 8 confirmed, 0 waitlist
      const existingRsvps = Array.from({ length: 8 }, (_, i) => ({
        id: `rsvp-${i}`,
        gameId: GAME_ID,
        playerId: `player-${i}`,
        status: 'confirmed',
      }))

      let capturedRsvp: any = null

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
            eq: jest.fn().mockImplementation((field: string) => {
              if (field === 'gameId') {
                return Promise.resolve({ data: existingRsvps, error: null })
              }
              return {
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                })),
              }
            }),
            insert: jest.fn((data: any) => {
              capturedRsvp = data
              return Promise.resolve({ data: null, error: null })
            }),
          }
        }
        return { select: jest.fn() }
      })

      const result = await addRSVP(GAME_ID, playerId)

      expect(result).toEqual({ success: true })
      expect(capturedRsvp.waitlistPosition).toBe(1)
    })
  })

  describe('Edge cases', () => {
    test('does not send confirmation email to waitlisted players', async () => {
      const playerId = '123e4567-e89b-12d3-a456-426614174001'

      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      // Setup: 8 existing confirmed RSVPs (game is full)
      const existingRsvps = Array.from({ length: 8 }, (_, i) => ({
        id: `rsvp-${i}`,
        gameId: GAME_ID,
        playerId: `player-${i}`,
        status: 'confirmed',
      }))

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
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return { select: jest.fn().mockResolvedValue({ data: existingRsvps, error: null }) }
      })

      await addRSVP(GAME_ID, playerId)

      // Verify no email was sent (waitlist players don't get confirmation emails)
      expect(mockSendEmail).not.toHaveBeenCalled()
      expect(mockGenerateGameIcs).not.toHaveBeenCalled()
    })

    test('correctly counts only confirmed RSVPs when determining status', async () => {
      const playerId = '123e4567-e89b-12d3-a456-426614174001'

      // Setup: Admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: ADMIN_USER_ID, email: 'admin@test.com' } },
      })

      // Setup: 7 confirmed + 5 waitlist (should still allow 8th confirmed)
      const existingRsvps = [
        ...Array.from({ length: 7 }, (_, i) => ({
          id: `rsvp-confirmed-${i}`,
          gameId: GAME_ID,
          playerId: `player-confirmed-${i}`,
          status: 'confirmed',
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `rsvp-waitlist-${i}`,
          gameId: GAME_ID,
          playerId: `player-waitlist-${i}`,
          status: 'waitlist',
          waitlistPosition: i + 1,
        })),
      ]

      let capturedRsvp: any = null

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
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            insert: jest.fn((data: any) => {
              capturedRsvp = data
              return Promise.resolve({ data: null, error: null })
            }),
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
        if (table === 'players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: playerId,
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@test.com',
              },
              error: null,
            }),
          }
        }
        return { select: jest.fn().mockResolvedValue({ data: existingRsvps, error: null }) }
      })

      const result = await addRSVP(GAME_ID, playerId)

      expect(result).toEqual({ success: true })
      expect(capturedRsvp.status).toBe('confirmed') // Should be confirmed (8th confirmed player)
      expect(capturedRsvp.waitlistPosition).toBeNull()
    })
  })
})
