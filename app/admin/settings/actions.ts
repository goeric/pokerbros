'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers';

export async function updateSetting(key: string, value: boolean) {
  try {
    const supabase = await createSupabaseServerClient();

    // Authorization check
    await requireAdmin(supabase);

    const { error } = await supabase
      .from('settings')
      .update({ value: value.toString() })
      .eq('key', key);

    if (error) {
      return handleServerError(error, 'ERR_SETTING_UPDATE', 'Failed to update setting. Please try again.');
    }

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_SETTING_UPDATE_AUTH');
  }
}
