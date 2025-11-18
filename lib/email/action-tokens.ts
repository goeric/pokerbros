'use server';

import { createSupabaseServerClient } from '@/lib/auth-helpers';
import { randomBytes } from 'crypto';

interface CreateTokenParams {
  gameId: string;
  playerId: string;
  action: 'rsvp' | 'cancel_rsvp';
}

interface TokenResult {
  success: boolean;
  token?: string;
  url?: string;
  error?: string;
}

/**
 * Generate a secure random token
 */
function generateSecureToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Create a one-time-use email action token
 * Tokens expire after 30 days
 */
export async function createEmailActionToken({
  gameId,
  playerId,
  action,
}: CreateTokenParams): Promise<TokenResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // Generate secure token
    const token = generateSecureToken();

    // Set expiration to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Insert token into database
    const { error } = await supabase
      .from('email_action_tokens')
      .insert({
        token,
        game_id: gameId,
        player_id: playerId,
        action,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      console.error('Failed to create email action token:', error);
      return { success: false, error: error.message };
    }

    // Generate action URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/game/${gameId}/action?token=${token}`;

    return { success: true, token, url };
  } catch (error) {
    console.error('Error creating email action token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate and consume an email action token
 * Returns the token details if valid, or null if invalid/expired/used
 */
export async function validateAndConsumeToken(token: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // Fetch token with all related data
    const { data: tokenData, error: fetchError } = await supabase
      .from('email_action_tokens')
      .select('*, games(*), players(*)')
      .eq('token', token)
      .single();

    if (fetchError || !tokenData) {
      return { success: false, error: 'Invalid token' };
    }

    // Check if token is already used
    if (tokenData.used_at) {
      return { success: false, error: 'Token already used' };
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < now) {
      return { success: false, error: 'Token expired' };
    }

    // Mark token as used
    const { error: updateError } = await supabase
      .from('email_action_tokens')
      .update({ used_at: now.toISOString() })
      .eq('token', token);

    if (updateError) {
      console.error('Failed to mark token as used:', updateError);
      return { success: false, error: 'Failed to consume token' };
    }

    return {
      success: true,
      gameId: tokenData.game_id,
      playerId: tokenData.player_id,
      action: tokenData.action as 'rsvp' | 'cancel_rsvp',
      game: tokenData.games,
      player: tokenData.players,
    };
  } catch (error) {
    console.error('Error validating token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
