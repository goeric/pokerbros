import { z } from 'zod';

/**
 * Validation schema for creating/updating a player
 */
export const PlayerSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .trim(),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .trim(),
  nickname: z
    .string()
    .max(30, 'Nickname must be less than 30 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters')
    .toLowerCase()
    .trim(),
});

/**
 * Validation schema for creating/updating a game
 */
export const GameSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .refine(
      (date) => {
        // Parse as local time to avoid timezone issues
        const [year, month, day] = date.split('-').map(Number);
        const gameDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return gameDate >= today;
      },
      { message: 'Game date cannot be in the past' }
    ),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  buyIn: z
    .number()
    .min(1, 'Buy-in must be at least $1')
    .max(10000, 'Buy-in cannot exceed $10,000')
    .int('Buy-in must be a whole number'),
  location_id: z
    .string()
    .uuid('Please select a valid location'),
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .trim()
    .optional()
    .or(z.literal('')),
});

/**
 * Validation schema for RSVP
 */
export const RSVPSchema = z.object({
  gameId: z.string().uuid('Invalid game ID'),
  playerId: z.string().uuid('Invalid player ID'),
});

/**
 * Validation schema for rebuy amount
 */
export const RebuySchema = z.object({
  gameId: z.string().uuid('Invalid game ID'),
  gamePlayerId: z.string().uuid('Invalid game player ID'),
  buyInAmount: z
    .number()
    .min(1, 'Buy-in amount must be at least $1')
    .max(10000, 'Buy-in amount cannot exceed $10,000')
    .int('Buy-in must be a whole number'),
});

/**
 * Validation schema for cash-out amounts
 */
export const CashOutSchema = z.record(
  z.string().uuid('Invalid player ID'),
  z
    .number()
    .min(0, 'Cash-out cannot be negative')
    .max(100000, 'Cash-out seems unrealistically high')
    .multipleOf(0.01, 'Cash-out must be a valid currency amount')
);

/**
 * Validation schema for early cash-out during a live game
 */
export const EarlyCashOutSchema = z.object({
  gameId: z.string().uuid(),
  gamePlayerId: z.string().uuid(),
  cashOutAmount: z.number().min(0).max(100000).multipleOf(0.01),
});

/**
 * Helper function to format Zod errors into user-friendly messages
 */
export function formatZodError(error: z.ZodError): {
  error: string;
  field?: string;
} {
  const firstIssue = error.issues[0];
  return {
    error: firstIssue.message,
    field: firstIssue.path[0]?.toString(),
  };
}
