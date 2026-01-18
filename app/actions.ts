'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers';
import { GameSchema, formatZodError } from '@/lib/validation';
import { sendEmail } from '@/lib/email/send-email';
import { createEmailActionToken } from '@/lib/email/action-tokens';
import GameCreated from '@/emails/templates/GameCreated';
import { formatDate, formatTime } from '@/lib/utils';

export async function createGame(gameData: {
  date: string;
  time: string;
  buyIn: number;
  location_id: string;
  notes: string;
}) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check
    await requireAdmin(supabase);

    // ✅ Input validation
    const result = GameSchema.safeParse(gameData);

    if (!result.success) {
      return formatZodError(result.error);
    }

    const validData = result.data;

    // Fetch location details for email and backward compatibility
    const { data: location } = await supabase
      .from('locations')
      .select('name, address')
      .eq('id', validData.location_id)
      .single();

    const { data, error } = await supabase
      .from('games')
      .insert({
        date: validData.date,
        time: validData.time,
        buyIn: validData.buyIn,
        location_id: validData.location_id,
        venue: location?.name || '', // Populate venue for backward compatibility
        status: 'upcoming',
        notes: validData.notes || null,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return handleServerError(error, 'ERR_GAME_CREATE', 'Failed to create game. Please try again.');
    }

    // Send email notification to all players with personalized RSVP links
    if (data && location) {
      // Get all players with email notifications enabled
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('email_notifications', true)
        .not('email', 'is', null);

      // Send individual emails with unique RSVP tokens
      if (players && players.length > 0) {
        for (let i = 0; i < players.length; i++) {
          const player = players[i];

          // Generate one-click RSVP token
          const tokenResult = await createEmailActionToken({
            gameId: data.id,
            playerId: player.id,
            action: 'rsvp',
          });

          await sendEmail({
            to: player.email,
            subject: `New Poker Night: ${formatDate(data.date)}`,
            react: GameCreated({
              gameId: data.id,
              date: formatDate(data.date),
              time: formatTime(data.time),
              location: location.name,
              address: location.address,
              buyIn: data.buyIn,
              notes: data.notes || undefined,
              rsvpUrl: tokenResult.success ? tokenResult.url : undefined,
            }),
          });

          // Add delay between sends to respect Resend rate limit (2 req/sec)
          // Use 1 second delay for safety margin
          if (i < players.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }
    }

    revalidatePath('/');
    return { success: true, data };
  } catch (error) {
    return handleServerError(error, 'ERR_GAME_CREATE_AUTH');
  }
}
