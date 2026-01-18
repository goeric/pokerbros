'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, handleServerError } from '@/lib/auth-helpers';
import { NotificationPreferences } from '@/types';

export async function updateProfile(playerId: string, updates: { nickname?: string }) {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', playerId);

    if (error) {
      return handleServerError(error, 'ERR_PROFILE_UPDATE', 'Failed to update profile. Please try again.');
    }

    revalidatePath('/profile');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_PROFILE_UPDATE_AUTH');
  }
}

export async function updateAvatar(playerId: string, avatar: string) {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('players')
      .update({ avatar })
      .eq('id', playerId);

    if (error) {
      return handleServerError(error, 'ERR_AVATAR_UPDATE', 'Failed to update avatar. Please try again.');
    }

    revalidatePath('/profile');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_AVATAR_UPDATE_AUTH');
  }
}

export async function updateNotificationPreferences(
  playerId: string,
  preferences: NotificationPreferences
) {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('players')
      .update({ notification_preferences: preferences })
      .eq('id', playerId);

    if (error) {
      return handleServerError(error, 'ERR_NOTIFICATION_PREFS_UPDATE', 'Failed to update notification preferences. Please try again.');
    }

    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_NOTIFICATION_PREFS_UPDATE_AUTH');
  }
}
