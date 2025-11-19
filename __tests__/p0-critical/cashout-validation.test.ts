/**
 * P0 CRITICAL TESTS: Cash-out Validation
 *
 * Why Critical: Financial integrity - prevents money tracking errors that would
 * corrupt all player statistics. Any bug here could lead to:
 * - Incorrect profit/loss calculations
 * - Wrong player stats (totalIn, totalOut, biggestWin, biggestLoss)
 * - Games marked complete with unbalanced books
 *
 * Priority: P0.1
 * Estimated Tests: 10
 */

import { finalizeGameResults } from '@/app/game/[id]/cashout/actions'
import { createSupabaseServerClient, requireAdmin } from '@/lib/auth-helpers'

// Mock dependencies
jest.mock('@/lib/auth-helpers')
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    const error: any = new Error('NEXT_REDIRECT')
    error.digest = 'NEXT_REDIRECT'
    throw error
  }),
}))

const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>
const mockCreateSupabaseServerClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>

describe('P0.1: Cash-out Validation (Critical)', () => {
  let mockSupabase: any

  // Use proper UUIDs for testing
  const PLAYER_1_ID = '123e4567-e89b-12d3-a456-426614174001'
  const PLAYER_2_ID = '123e4567-e89b-12d3-a456-426614174002'
  const GAME_PLAYER_1_ID = '223e4567-e89b-12d3-a456-426614174001'
  const GAME_PLAYER_2_ID = '223e4567-e89b-12d3-a456-426614174002'

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock admin authorization
    mockRequireAdmin.mockResolvedValue({
      id: 'admin-id',
      email: 'admin@test.com',
    } as any)

    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn(),
      auth: {
        getSession: jest.fn(),
      },
    }

    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabase)
  })

  describe('Total validation', () => {
    test('rejects when total in != total out', async () => {
      // Setup: Game with $200 total in, attempting $210 total out (difference > 0.01)
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
        { id: GAME_PLAYER_2_ID, playerId: PLAYER_2_ID, buyIns: [100] },
      ]
      const players = [
        { id: PLAYER_1_ID, totalIn: 0, totalOut: 0, gamesPlayed: 0, biggestWin: 0, biggestLoss: 0 },
        { id: PLAYER_2_ID, totalIn: 0, totalOut: 0, gamesPlayed: 0, biggestWin: 0, biggestLoss: 0 },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: gamePlayers, error: null }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockResolvedValue({ data: players, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 110, [PLAYER_2_ID]: 100 } // Total out = $210, total in = $200

      const result = await finalizeGameResults('game-1', cashOuts)

      expect(result).toEqual({
        error: expect.stringContaining("Totals don't match"),
      })
      expect(result.error).toContain('200.00')
      expect(result.error).toContain('210.00')
    })

    test('accepts when difference is within 0.01 tolerance', async () => {
      // Setup: Game with $200 total in, $200.005 total out (rounds to $200.01, within tolerance)
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
        { id: GAME_PLAYER_2_ID, playerId: PLAYER_2_ID, buyIns: [100] },
      ]
      const players = [
        { id: PLAYER_1_ID, totalIn: 0, totalOut: 0, gamesPlayed: 0, biggestWin: 0, biggestLoss: 0 },
        { id: PLAYER_2_ID, totalIn: 0, totalOut: 0, gamesPlayed: 0, biggestWin: 0, biggestLoss: 0 },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: gamePlayers, error: null }),
            update: jest.fn().mockReturnThis(),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockResolvedValue({ data: players, error: null }),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'games') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 100, [PLAYER_2_ID]: 100.01 } // Total out = $200.01, within 0.01 tolerance

      // Should not throw or return error
      await expect(finalizeGameResults('game-1', cashOuts)).rejects.toThrow('NEXT_REDIRECT')
    })
  })

  describe('Profit calculations', () => {
    test('calculates profit correctly for winner (single buy-in)', async () => {
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
      ]
      const players = [
        { id: PLAYER_1_ID, totalIn: 0, totalOut: 0, gamesPlayed: 0, biggestWin: 0, biggestLoss: 0 },
      ]

      let capturedProfit: number | null = null

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: gamePlayers, error: null }),
            update: jest.fn((data: any) => {
              capturedProfit = data.profit
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockResolvedValue({ data: players, error: null }),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'games') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 150 } // $150 cash-out - $100 buy-in = +$50 profit

      await expect(finalizeGameResults('game-1', cashOuts)).rejects.toThrow('NEXT_REDIRECT')

      expect(capturedProfit).toBe(50)
    })

    test('calculates profit correctly for winner (multiple rebuys)', async () => {
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100, 100, 50] }, // $250 total in
      ]
      const players = [
        { id: PLAYER_1_ID, totalIn: 0, totalOut: 0, gamesPlayed: 0, biggestWin: 0, biggestLoss: 0 },
      ]

      let capturedProfit: number | null = null

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: gamePlayers, error: null }),
            update: jest.fn((data: any) => {
              capturedProfit = data.profit
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockResolvedValue({ data: players, error: null }),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'games') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 400 } // $400 cash-out - $250 buy-in = +$150 profit

      await expect(finalizeGameResults('game-1', cashOuts)).rejects.toThrow('NEXT_REDIRECT')

      expect(capturedProfit).toBe(150)
    })

    test('calculates profit correctly for loser', async () => {
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
      ]
      const players = [
        { id: PLAYER_1_ID, totalIn: 0, totalOut: 0, gamesPlayed: 0, biggestWin: 0, biggestLoss: 0 },
      ]

      let capturedProfit: number | null = null

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: gamePlayers, error: null }),
            update: jest.fn((data: any) => {
              capturedProfit = data.profit
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockResolvedValue({ data: players, error: null }),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'games') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 50 } // $50 cash-out - $100 buy-in = -$50 loss

      await expect(finalizeGameResults('game-1', cashOuts)).rejects.toThrow('NEXT_REDIRECT')

      expect(capturedProfit).toBe(-50)
    })

    test('handles zero cash-out (busted player)', async () => {
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
      ]
      const players = [
        { id: PLAYER_1_ID, totalIn: 0, totalOut: 0, gamesPlayed: 0, biggestWin: 0, biggestLoss: 0 },
      ]

      let capturedProfit: number | null = null

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: gamePlayers, error: null }),
            update: jest.fn((data: any) => {
              capturedProfit = data.profit
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockResolvedValue({ data: players, error: null }),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'games') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 0 } // Busted - $0 cash-out - $100 buy-in = -$100 loss

      await expect(finalizeGameResults('game-1', cashOuts)).rejects.toThrow('NEXT_REDIRECT')

      expect(capturedProfit).toBe(-100)
    })
  })

  describe('Player stats updates', () => {
    test('updates player biggestWin stat when new win exceeds previous', async () => {
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
      ]
      const players = [
        { id: PLAYER_1_ID, totalIn: 0, totalOut: 0, gamesPlayed: 0, biggestWin: 30, biggestLoss: 0 },
      ]

      let capturedBiggestWin: number | null = null

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: gamePlayers, error: null }),
            update: jest.fn().mockReturnThis(),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockResolvedValue({ data: players, error: null }),
            update: jest.fn((data: any) => {
              capturedBiggestWin = data.biggestWin
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        if (table === 'games') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 150 } // +$50 profit, should update biggestWin from 30 to 50

      await expect(finalizeGameResults('game-1', cashOuts)).rejects.toThrow('NEXT_REDIRECT')

      expect(capturedBiggestWin).toBe(50)
    })

    test('does not update biggestWin when new win is lower', async () => {
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
      ]
      const players = [
        { id: PLAYER_1_ID, totalIn: 0, totalOut: 0, gamesPlayed: 0, biggestWin: 100, biggestLoss: 0 },
      ]

      let capturedBiggestWin: number | null = null

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: gamePlayers, error: null }),
            update: jest.fn().mockReturnThis(),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockResolvedValue({ data: players, error: null }),
            update: jest.fn((data: any) => {
              capturedBiggestWin = data.biggestWin
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        if (table === 'games') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 120 } // +$20 profit, should keep biggestWin at 100

      await expect(finalizeGameResults('game-1', cashOuts)).rejects.toThrow('NEXT_REDIRECT')

      expect(capturedBiggestWin).toBe(100)
    })

    test('updates player biggestLoss stat when new loss exceeds previous', async () => {
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
      ]
      const players = [
        { id: PLAYER_1_ID, totalIn: 0, totalOut: 0, gamesPlayed: 0, biggestWin: 0, biggestLoss: -20 },
      ]

      let capturedBiggestLoss: number | null = null

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: gamePlayers, error: null }),
            update: jest.fn().mockReturnThis(),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockResolvedValue({ data: players, error: null }),
            update: jest.fn((data: any) => {
              capturedBiggestLoss = data.biggestLoss
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        if (table === 'games') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 50 } // -$50 loss, should update biggestLoss from -20 to -50

      await expect(finalizeGameResults('game-1', cashOuts)).rejects.toThrow('NEXT_REDIRECT')

      expect(capturedBiggestLoss).toBe(-50)
    })

    test('increments gamesPlayed counter', async () => {
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
      ]
      const players = [
        { id: PLAYER_1_ID, totalIn: 200, totalOut: 180, gamesPlayed: 5, biggestWin: 50, biggestLoss: -30 },
      ]

      let capturedGamesPlayed: number | null = null

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: gamePlayers, error: null }),
            update: jest.fn().mockReturnThis(),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockResolvedValue({ data: players, error: null }),
            update: jest.fn((data: any) => {
              capturedGamesPlayed = data.gamesPlayed
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        if (table === 'games') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 100 }

      await expect(finalizeGameResults('game-1', cashOuts)).rejects.toThrow('NEXT_REDIRECT')

      expect(capturedGamesPlayed).toBe(6) // 5 + 1 = 6
    })

    test('updates totalIn and totalOut correctly', async () => {
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100, 50] }, // $150 total buy-in
      ]
      const players = [
        { id: PLAYER_1_ID, totalIn: 200, totalOut: 180, gamesPlayed: 2, biggestWin: 50, biggestLoss: -30 },
      ]

      let capturedTotalIn: number | null = null
      let capturedTotalOut: number | null = null

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: gamePlayers, error: null }),
            update: jest.fn().mockReturnThis(),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockResolvedValue({ data: players, error: null }),
            update: jest.fn((data: any) => {
              capturedTotalIn = data.totalIn
              capturedTotalOut = data.totalOut
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        if (table === 'games') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 200 } // $200 cash-out

      await expect(finalizeGameResults('game-1', cashOuts)).rejects.toThrow('NEXT_REDIRECT')

      expect(capturedTotalIn).toBe(350) // 200 + 150 = 350
      expect(capturedTotalOut).toBe(380) // 180 + 200 = 380
    })
  })

  describe('Game status', () => {
    test('marks game as completed after successful validation', async () => {
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
      ]
      const players = [
        { id: PLAYER_1_ID, totalIn: 0, totalOut: 0, gamesPlayed: 0, biggestWin: 0, biggestLoss: 0 },
      ]

      let gameUpdateCalled = false

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'game_players') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: gamePlayers, error: null }),
            update: jest.fn().mockReturnThis(),
          }
        }
        if (table === 'players') {
          return {
            select: jest.fn().mockResolvedValue({ data: players, error: null }),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'games') {
          return {
            update: jest.fn((data: any) => {
              if (data.status === 'completed') {
                gameUpdateCalled = true
              }
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 100 }

      await expect(finalizeGameResults('game-1', cashOuts)).rejects.toThrow('NEXT_REDIRECT')

      expect(gameUpdateCalled).toBe(true)
    })
  })
})
