'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NotificationPreferences } from '@/types';

export type NotificationType = keyof NotificationPreferences;

/**
 * Check if a player wants to receive a specific type of notification
 *
 * @param playerEmail - The player's email address
 * @param notificationType - The type of notification to check
 * @returns true if the player wants this notification, false otherwise
 */
export async function shouldSendNotification(
  playerEmail: string,
  notificationType: NotificationType
): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Fetch player's notification preferences
    const { data: player } = await supabase
      .from('players')
      .select('email_notifications, notification_preferences')
      .eq('email', playerEmail)
      .single();

    if (!player) {
      console.log(`[NOTIFICATION CHECK] Player not found: ${playerEmail}`);
      return false;
    }

    // First check if email notifications are enabled at all
    if (!player.email_notifications) {
      console.log(`[NOTIFICATION CHECK] Email notifications disabled for ${playerEmail}`);
      return false;
    }

    // Then check the specific notification preference
    const preferences = player.notification_preferences as NotificationPreferences;
    const wantsNotification = preferences?.[notificationType] ?? true; // Default to true if not set

    if (!wantsNotification) {
      console.log(`[NOTIFICATION CHECK] ${playerEmail} has disabled "${notificationType}" notifications`);
    }

    return wantsNotification;
  } catch (error) {
    console.error('[NOTIFICATION CHECK] Error checking preferences:', error);
    // Default to sending if there's an error (fail open)
    return true;
  }
}

/**
 * Filter a list of email addresses based on notification preferences
 *
 * @param emails - Array of email addresses
 * @param notificationType - The type of notification
 * @returns Array of emails that should receive this notification type
 */
export async function filterByNotificationPreference(
  emails: string[],
  notificationType: NotificationType
): Promise<string[]> {
  const results = await Promise.all(
    emails.map(async (email) => ({
      email,
      shouldSend: await shouldSendNotification(email, notificationType),
    }))
  );

  const filtered = results.filter((r) => r.shouldSend).map((r) => r.email);

  const skipped = emails.length - filtered.length;
  if (skipped > 0) {
    console.log(`[NOTIFICATION FILTER] Skipped ${skipped} recipient(s) based on notification preferences for "${notificationType}"`);
  }

  return filtered;
}
