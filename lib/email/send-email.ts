import { Resend } from 'resend';
import { render } from '@react-email/components';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Lazy-initialize Resend to avoid build errors when API key isn't available
let resendInstance: Resend | null = null;
function getResend() {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

/**
 * Get a feature flag value from the settings table
 */
async function getFeatureFlag(key: string, defaultValue: boolean = false): Promise<boolean> {
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

    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();

    if (!data) return defaultValue;

    // Value is stored as JSONB, so it could be a boolean or string "true"/"false"
    const value = data.value;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return defaultValue;
  } catch (error) {
    console.warn(`[SETTINGS] Failed to fetch flag "${key}", using default: ${defaultValue}`, error);
    return defaultValue;
  }
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  icsContent?: string;
}

interface EmailResult {
  success: boolean;
  skipped?: boolean;
  filteredRecipients?: string[];
  error?: string;
}

/**
 * Send an email via Resend with safety filtering
 *
 * IMPORTANT: When email_superadmin_only flag is enabled (default in production),
 * only sends emails to superadmins to prevent accidentally spamming real players.
 * Always filtered to superadmins in non-production environments.
 */
export async function sendEmail({
  to,
  subject,
  react,
  icsContent,
}: SendEmailOptions): Promise<EmailResult> {
  try {
    const recipients = Array.isArray(to) ? to : [to];

    // Check feature flag for email filtering
    // Default to true (superadmin-only) for safety
    const superadminOnly = process.env.NODE_ENV !== 'production'
      ? true // Always filter in dev/staging
      : await getFeatureFlag('email_superadmin_only', true); // Check flag in production

    // Safety filter: Only send to superadmins if flag is enabled
    let filteredRecipients = recipients;

    if (superadminOnly) {
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

      // Get all superadmin emails
      const { data: superadmins } = await supabase
        .from('admin_users')
        .select('email')
        .eq('is_superadmin', true);

      const superadminEmails = superadmins?.map((a) => a.email) || [];

      // Filter recipients to only include superadmins
      filteredRecipients = recipients.filter((email) =>
        superadminEmails.includes(email)
      );

      // Log what happened
      const skippedEmails = recipients.filter(
        (email) => !superadminEmails.includes(email)
      );

      if (skippedEmails.length > 0) {
        console.log(
          `[EMAIL SAFETY] Skipped sending to non-superadmins: ${skippedEmails.join(', ')}`
        );
      }

      if (filteredRecipients.length > 0) {
        console.log(
          `[EMAIL SAFETY] Sending email only to superadmins: ${filteredRecipients.join(', ')}`
        );
      }

      // If no superadmins in recipient list, skip sending entirely
      if (filteredRecipients.length === 0) {
        console.log(
          `[EMAIL SAFETY] No superadmins in recipient list - skipping email: "${subject}"`
        );
        return { success: true, skipped: true, filteredRecipients: [] };
      }
    }

    // Prepare email attachments (if .ics provided)
    const attachments = icsContent
      ? [
          {
            filename: 'event.ics',
            content: Buffer.from(icsContent).toString('base64'),
            contentType: 'text/calendar',
          },
        ]
      : undefined;

    // Send email via Resend
    const { data, error } = await getResend().emails.send({
      from: `${process.env.RESEND_FROM_NAME || 'PokerBros'} <${
        process.env.RESEND_FROM_EMAIL || 'poker@pokerbros.xyz'
      }>`,
      to: filteredRecipients,
      subject,
      html: await render(react),
      attachments,
    });

    if (error) {
      console.error('[EMAIL] Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.log(
      `[EMAIL] Sent successfully to ${filteredRecipients.length} recipient(s): "${subject}"`
    );

    return {
      success: true,
      filteredRecipients,
    };
  } catch (error: any) {
    console.error('[EMAIL] Unexpected error sending email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email to all players with email notifications enabled
 *
 * @param subject - Email subject line
 * @param react - React email template
 * @param notificationType - Optional notification type to filter by preferences
 */
export async function sendToAllPlayers({
  subject,
  react,
  notificationType,
}: {
  subject: string;
  react: React.ReactElement;
  notificationType?: import('@/lib/email/check-preferences').NotificationType;
}): Promise<EmailResult> {
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

    // Get all players with email notifications enabled
    const { data: players } = await supabase
      .from('players')
      .select('email, notification_preferences')
      .eq('email_notifications', true)
      .not('email', 'is', null);

    if (!players || players.length === 0) {
      console.log('[EMAIL] No players with email notifications enabled');
      return { success: true, skipped: true };
    }

    let playerEmails = players.map((p) => p.email).filter(Boolean) as string[];

    // Filter by specific notification type if provided
    if (notificationType) {
      const { filterByNotificationPreference } = await import('@/lib/email/check-preferences');
      playerEmails = await filterByNotificationPreference(playerEmails, notificationType);

      if (playerEmails.length === 0) {
        console.log(`[EMAIL] No players want "${notificationType}" notifications`);
        return { success: true, skipped: true };
      }
    }

    // Send email to all players (with safety filtering applied)
    return await sendEmail({
      to: playerEmails,
      subject,
      react,
    });
  } catch (error: any) {
    console.error('[EMAIL] Error sending to all players:', error);
    return { success: false, error: error.message };
  }
}
