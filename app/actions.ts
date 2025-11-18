'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers';
import { GameSchema, formatZodError } from '@/lib/validation';

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

    // Fetch location name for backward compatibility with venue field
    const { data: location } = await supabase
      .from('locations')
      .select('name')
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

    revalidatePath('/');
    return { success: true, data };
  } catch (error) {
    return handleServerError(error, 'ERR_GAME_CREATE_AUTH');
  }
}
