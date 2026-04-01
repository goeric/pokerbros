'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers';
import { GameSchema, formatZodError } from '@/lib/validation';
import { sendEmail } from '@/lib/email/send-email';
import { createEmailActionToken } from '@/lib/email/action-tokens';
import GameCreated from '@/emails/templates/GameCreated';
import { formatDate, formatTime } from '@/lib/utils';
import { Game, Location, Player } from '@/types';

async function sendGameCreatedNotifications({
  supabase,
  game,
  location,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  game: Game;
  location: { name: string; address: string };
}) {
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('email_notifications', true)
    .not('email', 'is', null);

  if (!players || players.length === 0) {
    return;
  }

  for (let i = 0; i < players.length; i++) {
    const player = players[i] as Player;

    const tokenResult = await createEmailActionToken({
      gameId: game.id,
      playerId: player.id,
      action: 'rsvp',
    });

    await sendEmail({
      to: player.email,
      subject: `New Poker Night: ${formatDate(game.date)}`,
      react: GameCreated({
        gameId: game.id,
        date: formatDate(game.date),
        time: formatTime(game.time),
        location: location.name,
        address: location.address,
        buyIn: game.buyIn,
        notes: game.notes || undefined,
        rsvpUrl: tokenResult.success ? tokenResult.url : undefined,
      }),
    });

    if (i < players.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

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

    if (data && location) {
      after(async () => {
        try {
          await sendGameCreatedNotifications({
            supabase,
            game: data as Game,
            location: location as Location,
          });
        } catch (notificationError) {
          console.error('[CREATE_GAME_NOTIFICATIONS]', notificationError);
        }
      });
    }

    revalidatePath('/');
    return { success: true, data };
  } catch (error) {
    return handleServerError(error, 'ERR_GAME_CREATE_AUTH');
  }
}
