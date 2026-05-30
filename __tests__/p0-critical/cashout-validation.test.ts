/**
 * P0 CRITICAL TESTS: Cash-out Validation
 *
 * Why Critical: Financial integrity - prevents money tracking errors that would
 * corrupt all player statistics. Any bug here could lead to:
 * - Incorrect profit/loss calculations
 * - Wrong player stats (totalIn, totalOut, biggestWin, biggestLoss)
 * - Games marked complete with unbalanced books
 * - Double-counted stats from re-running finalization
 *
 * finalizeGameResults now:
 * 1. Refuses to re-finalize an already-completed game (pre-check).
 * 2. Validates the books balance BEFORE writing anything.
 * 3. Writes each player's cashOut/profit (absolute, idempotent writes).
 * 4. Atomically claims the game via a conditional status update so two
 *    concurrent finalizes can never both succeed.
 * 5. Recomputes each participant's aggregate stats FROM SOURCE (see
 *    recomputePlayerStats / player-stats-recompute.test.ts), which can never
 *    double-count.
 *
 * Priority: P0.1
 */

import { finalizeGameResults } from '@/app/game/[id]/cashout/actions'
import { createSupabaseServerClient, requireAdmin } from '@/lib/auth-helpers'
import { recomputePlayerStats } from '@/lib/player-stats'

// Mock dependencies
jest.mock('@/lib/auth-helpers')
jest.mock('@/lib/player-stats')
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
const mockRecomputePlayerStats = recomputePlayerStats as jest.MockedFunction<typeof recomputePlayerStats>

describe('P0.1: Cash-out Validation (Critical)', () => {
  let mockSupabase: any

  // Use proper UUIDs for testing
  const GAME_ID = '323e4567-e89b-12d3-a456-426614174001'
  const PLAYER_1_ID = '123e4567-e89b-12d3-a456-426614174001'
  const PLAYER_2_ID = '123e4567-e89b-12d3-a456-426614174002'
  const GAME_PLAYER_1_ID = '223e4567-e89b-12d3-a456-426614174001'
  const GAME_PLAYER_2_ID = '223e4567-e89b-12d3-a456-426614174002'

  // Mock for the `games` table: handles both the status pre-check (select) and
  // the atomic finalization claim (update ... neq ... select).
  const createGamesMock = (
    {
      status = 'in_progress',
      claimRows = [{ id: GAME_ID }],
      onClaim,
    }: { status?: string | null; claimRows?: any[]; onClaim?: (data: any) => void } = {}
  ) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: status === null ? null : { status }, error: null }),
      }),
    }),
    update: jest.fn((data: any) => {
      if (onClaim) onClaim(data)
      return {
        eq: jest.fn().mockReturnValue({
          neq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: claimRows, error: null }),
          }),
        }),
      }
    }),
  })

  // Mock for the `game_players` table: handles the participant fetch
  // (select ... eq) and the per-player cashOut/profit writes (update ... eq).
  const createGamePlayersMock = (
    gamePlayers: any[],
    capture?: { profits?: Record<string, number>; cashOuts?: Record<string, number>; updateSpy?: jest.Mock }
  ) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: gamePlayers, error: null }),
    }),
    update: jest.fn((data: any) => {
      capture?.updateSpy?.(data)
      return {
        eq: jest.fn((field: string, value: any) => {
          if (field === 'id') {
            if (capture?.profits && data.profit !== undefined) capture.profits[value] = data.profit
            if (capture?.cashOuts && data.cashOut !== undefined) capture.cashOuts[value] = data.cashOut
          }
          return Promise.resolve({ data: null, error: null })
        }),
      }
    }),
  })

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequireAdmin.mockResolvedValue({ id: 'admin-id', email: 'admin@test.com' } as any)
    mockRecomputePlayerStats.mockResolvedValue({})

    mockSupabase = { from: jest.fn(), auth: { getSession: jest.fn() } }
    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabase)
  })

  describe('Total validation', () => {
    test('rejects when total in != total out', async () => {
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
        { id: GAME_PLAYER_2_ID, playerId: PLAYER_2_ID, buyIns: [100] },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') return createGamesMock()
        if (table === 'game_players') return createGamePlayersMock(gamePlayers)
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 110, [PLAYER_2_ID]: 100 } // out $210, in $200

      const result = await finalizeGameResults(GAME_ID, cashOuts)

      expect(result).toEqual({ error: expect.stringContaining("Totals don't match") })
      expect(result.error).toContain('200.00')
      expect(result.error).toContain('210.00')
      // Nothing should be finalized when the books don't balance.
      expect(mockRecomputePlayerStats).not.toHaveBeenCalled()
    })

    test('accepts when difference is within 0.01 tolerance', async () => {
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
        { id: GAME_PLAYER_2_ID, playerId: PLAYER_2_ID, buyIns: [100] },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') return createGamesMock()
        if (table === 'game_players') return createGamePlayersMock(gamePlayers)
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 100, [PLAYER_2_ID]: 100.01 } // within 0.01 tolerance

      await expect(finalizeGameResults(GAME_ID, cashOuts)).rejects.toThrow('NEXT_REDIRECT')
    })
  })

  describe('Profit calculations', () => {
    const expectProfit = async (gamePlayers: any[], cashOuts: Record<string, number>, gamePlayerId: string, expected: number) => {
      const profits: Record<string, number> = {}
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') return createGamesMock()
        if (table === 'game_players') return createGamePlayersMock(gamePlayers, { profits })
        return { select: jest.fn() }
      })

      await expect(finalizeGameResults(GAME_ID, cashOuts)).rejects.toThrow('NEXT_REDIRECT')
      expect(profits[gamePlayerId]).toBe(expected)
    }

    test('calculates profit correctly for winner (single buy-in)', async () => {
      await expectProfit(
        [
          { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
          { id: GAME_PLAYER_2_ID, playerId: PLAYER_2_ID, buyIns: [50] },
        ],
        { [PLAYER_1_ID]: 150, [PLAYER_2_ID]: 0 }, // total $150 in / $150 out
        GAME_PLAYER_1_ID,
        50
      )
    })

    test('calculates profit correctly for winner (multiple rebuys)', async () => {
      await expectProfit(
        [
          { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100, 100, 50] }, // $250 in
          { id: GAME_PLAYER_2_ID, playerId: PLAYER_2_ID, buyIns: [100, 50] }, // $150 in
        ],
        { [PLAYER_1_ID]: 400, [PLAYER_2_ID]: 0 }, // total $400 in / $400 out
        GAME_PLAYER_1_ID,
        150
      )
    })

    test('calculates profit correctly for loser', async () => {
      await expectProfit(
        [
          { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
          { id: GAME_PLAYER_2_ID, playerId: PLAYER_2_ID, buyIns: [50] },
        ],
        { [PLAYER_1_ID]: 50, [PLAYER_2_ID]: 100 }, // total $150 in / $150 out
        GAME_PLAYER_1_ID,
        -50
      )
    })

    test('handles zero cash-out (busted player)', async () => {
      await expectProfit(
        [
          { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
          { id: GAME_PLAYER_2_ID, playerId: PLAYER_2_ID, buyIns: [50] },
        ],
        { [PLAYER_1_ID]: 0, [PLAYER_2_ID]: 150 }, // total $150 in / $150 out
        GAME_PLAYER_1_ID,
        -100
      )
    })
  })

  describe('Player stats recompute', () => {
    test('recomputes aggregate stats from source for each participant', async () => {
      const gamePlayers = [
        { id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] },
        { id: GAME_PLAYER_2_ID, playerId: PLAYER_2_ID, buyIns: [50] },
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') return createGamesMock()
        if (table === 'game_players') return createGamePlayersMock(gamePlayers)
        return { select: jest.fn() }
      })

      const cashOuts = { [PLAYER_1_ID]: 150, [PLAYER_2_ID]: 0 }

      await expect(finalizeGameResults(GAME_ID, cashOuts)).rejects.toThrow('NEXT_REDIRECT')

      // Recompute (not additive adjustment) is invoked once per distinct player.
      expect(mockRecomputePlayerStats).toHaveBeenCalledTimes(2)
      expect(mockRecomputePlayerStats).toHaveBeenCalledWith(mockSupabase, PLAYER_1_ID)
      expect(mockRecomputePlayerStats).toHaveBeenCalledWith(mockSupabase, PLAYER_2_ID)
    })
  })

  describe('Game status / double-finalize protection', () => {
    test('marks game as completed after successful validation', async () => {
      const gamePlayers = [{ id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] }]
      let claimedCompleted = false

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') {
          return createGamesMock({
            onClaim: (data: any) => {
              if (data.status === 'completed') claimedCompleted = true
            },
          })
        }
        if (table === 'game_players') return createGamePlayersMock(gamePlayers)
        return { select: jest.fn() }
      })

      await expect(finalizeGameResults(GAME_ID, { [PLAYER_1_ID]: 100 })).rejects.toThrow('NEXT_REDIRECT')
      expect(claimedCompleted).toBe(true)
    })

    test('refuses to re-finalize an already-completed game (no writes)', async () => {
      const gamePlayers = [{ id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] }]
      const updateSpy = jest.fn()

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'games') return createGamesMock({ status: 'completed' })
        if (table === 'game_players') return createGamePlayersMock(gamePlayers, { updateSpy })
        return { select: jest.fn() }
      })

      const result = await finalizeGameResults(GAME_ID, { [PLAYER_1_ID]: 100 })

      expect(result).toEqual({ error: 'Game has already been finalized.' })
      expect(updateSpy).not.toHaveBeenCalled() // no cashOut/profit overwrite
      expect(mockRecomputePlayerStats).not.toHaveBeenCalled() // no stat changes
    })

    test('aborts when the atomic claim is lost (concurrent finalize)', async () => {
      const gamePlayers = [{ id: GAME_PLAYER_1_ID, playerId: PLAYER_1_ID, buyIns: [100] }]

      mockSupabase.from.mockImplementation((table: string) => {
        // Pre-check passes (in_progress) but the conditional claim updates 0 rows
        // because another request finalized it first.
        if (table === 'games') return createGamesMock({ status: 'in_progress', claimRows: [] })
        if (table === 'game_players') return createGamePlayersMock(gamePlayers)
        return { select: jest.fn() }
      })

      const result = await finalizeGameResults(GAME_ID, { [PLAYER_1_ID]: 100 })

      expect(result).toEqual({ error: 'Game has already been finalized.' })
      // Stats must NOT be recomputed by the loser of the race.
      expect(mockRecomputePlayerStats).not.toHaveBeenCalled()
    })
  })
})
