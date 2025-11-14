'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers';
import { PlayerSchema, formatZodError } from '@/lib/validation';

export async function createPlayer(formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check
    await requireAdmin(supabase);

    // ✅ Input validation
    const result = PlayerSchema.safeParse({
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      nickname: formData.get('nickname'),
      email: formData.get('email'),
    });

    if (!result.success) {
      return formatZodError(result.error);
    }

    const validData = result.data;

    const { error } = await supabase.from('players').insert({
      ...validData,
      nickname: validData.nickname || null,
      totalIn: 0,
      totalOut: 0,
      gamesPlayed: 0,
      biggestWin: 0,
      biggestLoss: 0,
    });

    if (error) {
      return handleServerError(error, 'ERR_PLAYER_CREATE', 'Failed to create player. Please try again.');
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_PLAYER_CREATE_AUTH');
  }
}

export async function updatePlayer(playerId: string, formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check
    await requireAdmin(supabase);

    // ✅ Input validation
    const result = PlayerSchema.safeParse({
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      nickname: formData.get('nickname'),
      email: formData.get('email'),
    });

    if (!result.success) {
      return formatZodError(result.error);
    }

    const validData = result.data;

    const { error } = await supabase
      .from('players')
      .update({
        ...validData,
        nickname: validData.nickname || null,
      })
      .eq('id', playerId);

    if (error) {
      return handleServerError(error, 'ERR_PLAYER_UPDATE', 'Failed to update player. Please try again.');
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_PLAYER_UPDATE_AUTH');
  }
}

export async function deletePlayer(playerId: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check
    await requireAdmin(supabase);

    const { error } = await supabase.from('players').delete().eq('id', playerId);

    if (error) {
      return handleServerError(error, 'ERR_PLAYER_DELETE', 'Failed to delete player. Please try again.');
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_PLAYER_DELETE_AUTH');
  }
}
