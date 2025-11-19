import { createClient } from '@supabase/supabase-js'

/**
 * Mock Supabase client for testing
 * Usage: mockSupabaseQuery({ data: [...], error: null })
 */
export const mockSupabaseQuery = (result: { data?: any; error?: any }) => {
  return {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
    then: jest.fn((resolve) => resolve(result)),
  }
}

/**
 * Create a mock Supabase client
 */
export const createMockSupabaseClient = () => {
  return {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
    rpc: jest.fn(),
  }
}

/**
 * Mock authenticated session
 */
export const mockAuthSession = (userEmail: string = 'admin@test.com', isAdmin: boolean = true) => {
  return {
    data: {
      session: {
        user: {
          id: 'test-user-id',
          email: userEmail,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
      },
      user: {
        id: 'test-user-id',
        email: userEmail,
      },
    },
    error: null,
  }
}

/**
 * Mock no session (unauthenticated)
 */
export const mockNoSession = () => {
  return {
    data: { session: null, user: null },
    error: null,
  }
}
