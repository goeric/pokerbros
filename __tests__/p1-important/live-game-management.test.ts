/**
 * P1 IMPORTANT TESTS: Live Game Management
 *
 * Why Important: Core gameplay functionality. Bugs affect user experience but don't corrupt data.
 * Tests the ability for admins to add and remove rebuys during live games, which is critical
 * for accurate money tracking.
 *
 * Priority: P1.1
 * Estimated Tests: 6
 */

import { addRebuy, removeLastRebuy } from '@/app/game/[id]/live/actions'
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
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const mockCreateSupabaseServerClient = createSupabaseServerClient as jest.MockedFunction<
  typeof createSupabaseServerClient
>
const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>

describe('P1.1: Live Game Management (Important)', () => {
  let mockSupabase: any

  // Use proper UUIDs for testing
  const GAME_ID = '323e4567-e89b-12d3-a456-426614174001'
  const GAME_PLAYER_ID = '423e4567-e89b-12d3-a456-426614174001'
  const ADMIN_USER_ID = 'admin-123e4567-e89b-12d3-a456-426614174001'
  const NON_ADMIN_USER_ID = 'user-123e4567-e89b-12d3-a456-426614174002'

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

  describe('Adding rebuys', () => {
    test('admin can add rebuy to any player during live game', async () => {
      // Setup: Admin is authorized
      mockRequireAdmin.mockResolvedValue(undefined)

      const existingBuyIns = [100]
      const newRebuyAmount = 100

      let updateCallArgs: any = null

      // Mock select query for game player (first call)
      // Then mock update query (second call)
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          // Return different mocks for select vs update
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: GAME_PLAYER_ID, buyIns: existingBuyIns },
                  error: null,
                }),
              })),
            })),
            update: jest.fn((data: any) => {
              updateCallArgs = data
              return {
                eq: jest.fn().mockResolvedValue({ error: null }),
              }
            }),
          }
        }
        return {}
      })

      const result = await addRebuy(GAME_ID, GAME_PLAYER_ID, newRebuyAmount)

      expect(result).toEqual({ success: true })
      expect(mockSupabase.from).toHaveBeenCalledWith('game_players')

      // Verify update was called with correct buy-ins array
      expect(updateCallArgs).toEqual({ buyIns: [100, 100] })
    })

    test('rebuy amount added to player\'s buyIns array', async () => {
      mockRequireAdmin.mockResolvedValue(undefined)

      const existingBuyIns = [100, 50] // Player already has a rebuy
      const newRebuyAmount = 75

      let updateCallArgs: any = null

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: GAME_PLAYER_ID, buyIns: existingBuyIns },
                  error: null,
                }),
              })),
            })),
            update: jest.fn((data: any) => {
              updateCallArgs = data
              return {
                eq: jest.fn().mockResolvedValue({ error: null }),
              }
            }),
          }
        }
        return {}
      })

      await addRebuy(GAME_ID, GAME_PLAYER_ID, newRebuyAmount)

      expect(updateCallArgs).toEqual({ buyIns: [100, 50, 75] })
    })

    test('non-admin cannot add rebuys', async () => {
      // Setup: Non-admin tries to add rebuy
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized: Admin access required'))

      const result = await addRebuy(GAME_ID, GAME_PLAYER_ID, 100)

      expect(result).toEqual({ error: 'Unauthorized: Admin access required' })
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })

  describe('Removing rebuys', () => {
    test('admin can remove last rebuy (error correction)', async () => {
      mockRequireAdmin.mockResolvedValue(undefined)

      const existingBuyIns = [100, 100] // Initial + 1 rebuy

      let updateCallArgs: any = null

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: GAME_PLAYER_ID, buyIns: existingBuyIns },
                  error: null,
                }),
              })),
            })),
            update: jest.fn((data: any) => {
              updateCallArgs = data
              return {
                eq: jest.fn().mockResolvedValue({ error: null }),
              }
            }),
          }
        }
        return {}
      })

      const result = await removeLastRebuy(GAME_ID, GAME_PLAYER_ID)

      expect(result).toEqual({ success: true })
      expect(updateCallArgs).toEqual({ buyIns: [100] })
    })

    test('cannot remove initial buy-in (minimum 1 buy-in per player)', async () => {
      mockRequireAdmin.mockResolvedValue(undefined)

      const existingBuyIns = [100] // Only initial buy-in

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: GAME_PLAYER_ID, buyIns: existingBuyIns },
              error: null,
            }),
            update: jest.fn().mockReturnThis(),
          }
        }
        return {}
      })

      const result = await removeLastRebuy(GAME_ID, GAME_PLAYER_ID)

      expect(result).toEqual({ error: 'Cannot remove initial buy-in' })

      // Verify update was NOT called
      const fromResult = mockSupabase.from.mock.results[0].value
      expect(fromResult.update).not.toHaveBeenCalled()
    })

    test('non-admin cannot remove rebuys', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized: Admin access required'))

      const result = await removeLastRebuy(GAME_ID, GAME_PLAYER_ID)

      expect(result).toEqual({ error: 'Unauthorized: Admin access required' })
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })
})
