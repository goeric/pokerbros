/**
 * P1 IMPORTANT TESTS: Walk-in Player Management
 *
 * Why Important: Adds players who didn't RSVP to a live game. Incorrect behavior would
 * either block legitimate walk-ins (game friction) or allow duplicates / edits to
 * completed games (data corruption).
 *
 * Priority: P1.5
 */

import { addWalkInPlayer } from '@/app/game/[id]/live/actions'
import {
  createSupabaseServerClient,
  requireAdmin,
  requireGameNotCompleted,
} from '@/lib/auth-helpers'
import type { User } from '@supabase/supabase-js'

const mockAdminUser: User = {
  id: 'admin-123e4567-e89b-12d3-a456-426614174001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'admin@test.com',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2024-01-01T00:00:00.000Z',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: {},
  identities: [],
  factors: [],
}

jest.mock('@/lib/auth-helpers', () => ({
  createSupabaseServerClient: jest.fn(),
  requireAdmin: jest.fn(),
  requireGameNotCompleted: jest.fn(),
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
const mockRequireGameNotCompleted = requireGameNotCompleted as jest.MockedFunction<
  typeof requireGameNotCompleted
>

describe('P1.5: Walk-in Player Management (Important)', () => {
  let mockSupabase: any

  const GAME_ID = '323e4567-e89b-12d3-a456-426614174001'
  const PLAYER_ID = '523e4567-e89b-12d3-a456-426614174001'
  const BUY_IN = 100

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      from: jest.fn(),
      auth: { getSession: jest.fn() },
    }

    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabase)
    mockRequireAdmin.mockResolvedValue(mockAdminUser)
    mockRequireGameNotCompleted.mockResolvedValue({
      game: { status: 'in_progress', buyIn: BUY_IN },
    })
  })

  test('admin can add walk-in player with game buy-in', async () => {
    let insertPayload: any = null
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'game_players') {
        return {
          insert: jest.fn((data: any) => {
            insertPayload = data
            return Promise.resolve({ error: null })
          }),
        }
      }
      return {}
    })

    const result = await addWalkInPlayer(GAME_ID, PLAYER_ID)

    expect(result).toEqual({ success: true })
    expect(insertPayload).toEqual({
      gameId: GAME_ID,
      playerId: PLAYER_ID,
      buyIns: [BUY_IN],
      cashOut: 0,
      profit: 0,
    })
  })

  test('non-admin cannot add walk-in', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Unauthorized: Admin access required'))

    const result = await addWalkInPlayer(GAME_ID, PLAYER_ID)

    expect(result).toEqual({ error: 'Unauthorized: Admin access required' })
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  test('invalid gameId is rejected by schema', async () => {
    const result = await addWalkInPlayer('not-a-uuid', PLAYER_ID)

    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toMatch(/Invalid game ID/)
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  test('invalid playerId is rejected by schema', async () => {
    const result = await addWalkInPlayer(GAME_ID, 'not-a-uuid')

    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toMatch(/Invalid player ID/)
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  test('completed game rejects walk-in via requireGameNotCompleted', async () => {
    mockRequireGameNotCompleted.mockResolvedValue({
      error: 'Cannot add a walk-in to a completed game.',
    })

    const result = await addWalkInPlayer(GAME_ID, PLAYER_ID)

    expect(result).toEqual({ error: 'Cannot add a walk-in to a completed game.' })
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  test('duplicate (unique constraint 23505) maps to friendly error', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'game_players') {
        return {
          insert: jest.fn().mockResolvedValue({
            error: { code: '23505', message: 'duplicate key value violates unique constraint' },
          }),
        }
      }
      return {}
    })

    const result = await addWalkInPlayer(GAME_ID, PLAYER_ID)

    expect(result).toEqual({ error: 'Player is already in this game.' })
  })

  test('non-duplicate insert error returns generic failure message', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'game_players') {
        return {
          insert: jest.fn().mockResolvedValue({
            error: { code: '42P01', message: 'relation does not exist' },
          }),
        }
      }
      return {}
    })

    const result = await addWalkInPlayer(GAME_ID, PLAYER_ID)

    expect(result).toEqual({ error: 'Failed to add walk-in player. Please try again.' })
  })
})
