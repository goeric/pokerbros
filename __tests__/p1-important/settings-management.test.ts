/**
 * P1 IMPORTANT TESTS: Settings Management
 *
 * Why Important: Settings control critical app behavior like email filtering.
 * Bugs here could lead to:
 * - Wrong data types stored (string "false" vs boolean false)
 * - Feature flags not working correctly
 * - Emails not being filtered properly
 * - Configuration errors
 *
 * Priority: P1.1
 * Estimated Tests: 15
 */

import { updateSetting } from '@/app/admin/settings/actions'
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

describe('P1.1: Settings Management (Important)', () => {
  let mockSupabase: any
  let capturedValue: any

  const ADMIN_USER_ID = 'admin-123e4567-e89b-12d3-a456-426614174001'

  beforeEach(() => {
    jest.clearAllMocks()
    capturedValue = undefined

    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn(),
      auth: {
        getUser: jest.fn(),
      },
    }

    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabase)

    // Mock requireAdmin to succeed by default
    mockRequireAdmin.mockResolvedValue({
      id: ADMIN_USER_ID,
      email: 'admin@test.com',
    } as any)
  })

  describe('Boolean value storage', () => {
    test('saves boolean true as JSON boolean (not string)', async () => {
      // Setup: Capture the value passed to update()
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'settings') {
          return {
            update: jest.fn((data: any) => {
              capturedValue = data.value
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        return { select: jest.fn() }
      })

      await updateSetting('email_superadmin_only', true)

      // Verify: Value should be boolean true, not string "true"
      expect(capturedValue).toBe(true)
      expect(typeof capturedValue).toBe('boolean')
    })

    test('saves boolean false as JSON boolean (not string)', async () => {
      // Setup: Capture the value passed to update()
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'settings') {
          return {
            update: jest.fn((data: any) => {
              capturedValue = data.value
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        return { select: jest.fn() }
      })

      await updateSetting('email_superadmin_only', false)

      // Verify: Value should be boolean false, not string "false"
      expect(capturedValue).toBe(false)
      expect(typeof capturedValue).toBe('boolean')

      // Critical: String "false" is truthy in JavaScript, boolean false is falsy
      expect(!!capturedValue).toBe(false)
      // Demonstrate the bug this test prevents: string "false" is truthy
      const stringFalse = 'false' as string
      expect(!!stringFalse).toBe(true)
    })

    test('JavaScript truthiness verification', () => {
      // This test documents the bug we fixed:
      // String "false" is truthy, boolean false is falsy

      const stringFalse = 'false'
      const booleanFalse = false

      // String "false" is truthy (BAD)
      expect(!!stringFalse).toBe(true)
      if (stringFalse) {
        // This branch executes! String "false" is truthy
        expect(true).toBe(true)
      } else {
        fail('String "false" should be truthy')
      }

      // Boolean false is falsy (GOOD)
      expect(!!booleanFalse).toBe(false)
      if (booleanFalse) {
        fail('Boolean false should be falsy')
      } else {
        // This branch executes correctly
        expect(true).toBe(true)
      }
    })
  })

  describe('Authorization', () => {
    test('requires admin authentication', async () => {
      // Setup: requireAdmin throws error
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized: Please sign in'))

      const result = await updateSetting('email_superadmin_only', true)

      expect(result).toEqual({ error: 'Unauthorized: Please sign in' })
      expect(mockRequireAdmin).toHaveBeenCalledWith(mockSupabase)
    })

    test('allows admin users to update settings', async () => {
      // Setup: Admin user
      mockRequireAdmin.mockResolvedValue({
        id: ADMIN_USER_ID,
        email: 'admin@test.com',
      } as any)

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'settings') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          }
        }
        return { select: jest.fn() }
      })

      const result = await updateSetting('email_superadmin_only', true)

      expect(result).toEqual({ success: true })
      expect(mockRequireAdmin).toHaveBeenCalledWith(mockSupabase)
    })
  })

  describe('Database operations', () => {
    test('updates existing setting by key', async () => {
      let capturedKey: string | undefined

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'settings') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn((field: string, value: any) => {
                capturedKey = value
                return Promise.resolve({ data: null, error: null })
              }),
            })),
          }
        }
        return { select: jest.fn() }
      })

      await updateSetting('email_superadmin_only', true)

      expect(capturedKey).toBe('email_superadmin_only')
    })

    test('handles database errors gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'settings') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' },
              }),
            })),
          }
        }
        return { select: jest.fn() }
      })

      const result = await updateSetting('email_superadmin_only', true)

      expect(result).toEqual({ error: 'Failed to update setting. Please try again.' })
    })

    test('calls revalidatePath after successful update', async () => {
      const { revalidatePath } = require('next/cache')

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'settings') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          }
        }
        return { select: jest.fn() }
      })

      await updateSetting('email_superadmin_only', true)

      expect(revalidatePath).toHaveBeenCalledWith('/admin/settings')
    })
  })

  describe('Feature flag values', () => {
    test('can toggle email_superadmin_only to true', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'settings') {
          return {
            update: jest.fn((data: any) => {
              capturedValue = data.value
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        return { select: jest.fn() }
      })

      await updateSetting('email_superadmin_only', true)

      expect(capturedValue).toBe(true)
    })

    test('can toggle email_superadmin_only to false', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'settings') {
          return {
            update: jest.fn((data: any) => {
              capturedValue = data.value
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        return { select: jest.fn() }
      })

      await updateSetting('email_superadmin_only', false)

      expect(capturedValue).toBe(false)
    })

    test('multiple toggles maintain correct types', async () => {
      const capturedValues: any[] = []

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'settings') {
          return {
            update: jest.fn((data: any) => {
              capturedValues.push(data.value)
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        return { select: jest.fn() }
      })

      // Toggle multiple times
      await updateSetting('email_superadmin_only', true)
      await updateSetting('email_superadmin_only', false)
      await updateSetting('email_superadmin_only', true)

      // All values should be booleans
      expect(capturedValues).toEqual([true, false, true])
      capturedValues.forEach((val) => {
        expect(typeof val).toBe('boolean')
      })
    })
  })

  describe('Setting key validation', () => {
    test('accepts valid setting key', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'settings') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          }
        }
        return { select: jest.fn() }
      })

      const result = await updateSetting('email_superadmin_only', true)

      expect(result).toEqual({ success: true })
    })

    test('handles arbitrary setting keys', async () => {
      // Settings table supports any key, not just predefined ones
      let capturedKey: string | undefined

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'settings') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn((field: string, value: any) => {
                capturedKey = value
                return Promise.resolve({ data: null, error: null })
              }),
            })),
          }
        }
        return { select: jest.fn() }
      })

      await updateSetting('custom_feature_flag', true)

      expect(capturedKey).toBe('custom_feature_flag')
    })
  })

  describe('Error handling', () => {
    test('handles auth errors', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Invalid token'))

      const result = await updateSetting('email_superadmin_only', true)

      expect(result).toEqual({ error: 'Invalid token' })
    })

    test('handles network errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network error')
      })

      const result = await updateSetting('email_superadmin_only', true)

      expect(result).toEqual({ error: 'Network error' })
    })

    test('returns structured error response', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'settings') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Constraint violation' },
              }),
            })),
          }
        }
        return { select: jest.fn() }
      })

      const result = await updateSetting('email_superadmin_only', true)

      expect(result).toHaveProperty('error')
      // Use type narrowing: check if 'success' property exists before accessing
      expect('success' in result ? result.success : undefined).toBeUndefined()
    })
  })
})
