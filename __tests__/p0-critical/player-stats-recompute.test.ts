/**
 * P0 CRITICAL TESTS: Player Stats Recompute
 *
 * Why Critical: Lifetime aggregate stats (totalIn, totalOut, gamesPlayed,
 * biggestWin, biggestLoss) are recomputed FROM SOURCE — every game_player row
 * belonging to a completed game — rather than adjusted additively. This is what
 * makes finalization idempotent (no double-counting on retry) and makes game
 * deletion correctly reverse a player's totals, including biggestWin/biggestLoss
 * which an additive running max/min could never recover.
 *
 * Priority: P0.1
 */

import { recomputePlayerStats } from '@/lib/player-stats'

const PLAYER_ID = '123e4567-e89b-12d3-a456-426614174001'

// Build a Supabase mock where:
//  - game_players.select(...).eq('playerId').eq('games.status') resolves to `rows`
//  - players.update({...}).eq('id') captures the written aggregate payload
const buildMockSupabase = (rows: any[], selectError: any = null, updateError: any = null) => {
  const captured: { payload?: any } = {}
  const supabase: any = {
    from: jest.fn((table: string) => {
      if (table === 'game_players') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: selectError ? null : rows, error: selectError }),
            }),
          }),
        }
      }
      if (table === 'players') {
        return {
          update: jest.fn((payload: any) => {
            captured.payload = payload
            return { eq: jest.fn().mockResolvedValue({ data: null, error: updateError }) }
          }),
        }
      }
      return {}
    }),
  }
  return { supabase, captured }
}

describe('P0.1: recomputePlayerStats (Critical)', () => {
  test('aggregates totalIn, totalOut and gamesPlayed across completed games', async () => {
    const rows = [
      { buyIns: [100, 50], cashOut: 300, profit: 150 }, // game 1: in 150, out 300
      { buyIns: [100], cashOut: 0, profit: -100 }, // game 2: in 100, out 0
    ]
    const { supabase, captured } = buildMockSupabase(rows)

    const result = await recomputePlayerStats(supabase, PLAYER_ID)

    expect(result).toEqual({})
    expect(captured.payload).toEqual({
      totalIn: 250,
      totalOut: 300,
      gamesPlayed: 2,
      biggestWin: 150,
      biggestLoss: -100,
    })
  })

  test('biggestWin is the max positive profit; biggestLoss the min negative profit', async () => {
    const rows = [
      { buyIns: [100], cashOut: 120, profit: 20 },
      { buyIns: [100], cashOut: 350, profit: 250 }, // biggest win
      { buyIns: [100], cashOut: 40, profit: -60 }, // biggest loss
      { buyIns: [100], cashOut: 90, profit: -10 },
    ]
    const { supabase, captured } = buildMockSupabase(rows)

    await recomputePlayerStats(supabase, PLAYER_ID)

    expect(captured.payload.biggestWin).toBe(250)
    expect(captured.payload.biggestLoss).toBe(-60)
  })

  test('never-won player has biggestWin 0; never-lost player has biggestLoss 0', async () => {
    const onlyLosses = buildMockSupabase([
      { buyIns: [100], cashOut: 0, profit: -100 },
      { buyIns: [100], cashOut: 50, profit: -50 },
    ])
    await recomputePlayerStats(onlyLosses.supabase, PLAYER_ID)
    expect(onlyLosses.captured.payload.biggestWin).toBe(0)
    expect(onlyLosses.captured.payload.biggestLoss).toBe(-100)

    const onlyWins = buildMockSupabase([{ buyIns: [100], cashOut: 180, profit: 80 }])
    await recomputePlayerStats(onlyWins.supabase, PLAYER_ID)
    expect(onlyWins.captured.payload.biggestWin).toBe(80)
    expect(onlyWins.captured.payload.biggestLoss).toBe(0)
  })

  test('resets all stats to zero when the player has no completed games (reversal)', async () => {
    const { supabase, captured } = buildMockSupabase([])

    await recomputePlayerStats(supabase, PLAYER_ID)

    expect(captured.payload).toEqual({
      totalIn: 0,
      totalOut: 0,
      gamesPlayed: 0,
      biggestWin: 0,
      biggestLoss: 0,
    })
  })

  test('returns an error and writes nothing when the source query fails', async () => {
    const { supabase, captured } = buildMockSupabase([], { message: 'db down' })

    const result = await recomputePlayerStats(supabase, PLAYER_ID)

    expect(result.error).toBeDefined()
    expect(captured.payload).toBeUndefined()
  })

  test('surfaces an error when the stats update fails', async () => {
    const { supabase } = buildMockSupabase([{ buyIns: [100], cashOut: 100, profit: 0 }], null, { message: 'write failed' })

    const result = await recomputePlayerStats(supabase, PLAYER_ID)

    expect(result.error).toBeDefined()
  })
})
