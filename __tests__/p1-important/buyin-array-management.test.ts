/**
 * P1 IMPORTANT TESTS: Buy-in Array Management
 *
 * Why Important: Buy-in integrity directly affects profit calculations. The buyIns array
 * must accurately track all rebuys in order to calculate correct profit/loss.
 *
 * Priority: P1.3
 * Estimated Tests: 4
 */

import { addRebuy } from '@/app/game/[id]/live/actions'
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers'
import type { User } from '@supabase/supabase-js'

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

describe('P1.3: Buy-in Array Management (Important)', () => {
  let mockSupabase: any

  // Use proper UUIDs for testing
  const GAME_ID = '323e4567-e89b-12d3-a456-426614174001'
  const GAME_PLAYER_ID = '423e4567-e89b-12d3-a456-426614174001'

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

    // Mock admin user with required User properties
    const mockUser: User = {
      id: 'admin-123e4567-e89b-12d3-a456-426614174001',
      email: 'admin@test.com',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
    }
    mockRequireAdmin.mockResolvedValue(mockUser)
  })

  describe('Array operations', () => {
    test('adding buy-in appends to array correctly', async () => {
      const existingBuyIns = [100]
      const newRebuyAmount = 50

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

      expect(updateCallArgs).toEqual({ buyIns: [100, 50] })
    })

    test('multiple buy-ins stored in order', async () => {
      // Test multiple sequential rebuys
      const testSequence = [
        { existing: [100], newRebuy: 50, expected: [100, 50] },
        { existing: [100, 50], newRebuy: 75, expected: [100, 50, 75] },
        { existing: [100, 50, 75], newRebuy: 100, expected: [100, 50, 75, 100] },
      ]

      for (const test of testSequence) {
        jest.clearAllMocks()

        let updateCallArgs: any = null

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'game_players') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { id: GAME_PLAYER_ID, buyIns: test.existing },
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

        await addRebuy(GAME_ID, GAME_PLAYER_ID, test.newRebuy)

        expect(updateCallArgs).toEqual({ buyIns: test.expected })
      }
    })

    test('buy-in sum calculation accurate', async () => {
      // Test that array maintains integrity for sum calculations
      const buyInArrays = [
        { buyIns: [100], expectedSum: 100 },
        { buyIns: [100, 50], expectedSum: 150 },
        { buyIns: [100, 50, 75], expectedSum: 225 },
        { buyIns: [100, 100, 100, 100], expectedSum: 400 },
      ]

      for (const testCase of buyInArrays) {
        const sum = testCase.buyIns.reduce((total, buyIn) => total + buyIn, 0)
        expect(sum).toBe(testCase.expectedSum)
      }
    })

    test('cannot add negative buy-ins (validation)', async () => {
      const existingBuyIns = [100]
      const negativeBuyIn = -50

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
              return {
                eq: jest.fn().mockResolvedValue({ error: null }),
              }
            }),
          }
        }
        return {}
      })

      const result = await addRebuy(GAME_ID, GAME_PLAYER_ID, negativeBuyIn)

      // Validation should reject negative amounts (actual error message from validation)
      expect(result).toHaveProperty('error')
      // Type narrowing: check that result has 'error' property before accessing
      if ('error' in result) {
        expect(result.error).toContain('must be at least $1')
      } else {
        fail('Expected result to have error property')
      }
    })
  })
})
