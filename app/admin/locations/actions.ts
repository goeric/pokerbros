'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, requireAdmin, handleServerError } from '@/lib/auth-helpers';

export async function createLocation(formData: { name: string; address: string }) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check
    await requireAdmin(supabase);

    const { data, error } = await supabase
      .from('locations')
      .insert({
        name: formData.name,
        address: formData.address,
      })
      .select()
      .single();

    if (error) {
      return handleServerError(error, 'ERR_LOCATION_CREATE', 'Failed to create location. Please try again.');
    }

    revalidatePath('/admin/locations');
    return { success: true, data };
  } catch (error) {
    return handleServerError(error, 'ERR_LOCATION_CREATE_AUTH');
  }
}

export async function updateLocation(id: string, formData: { name: string; address: string }) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check
    await requireAdmin(supabase);

    const { data, error } = await supabase
      .from('locations')
      .update({
        name: formData.name,
        address: formData.address,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return handleServerError(error, 'ERR_LOCATION_UPDATE', 'Failed to update location. Please try again.');
    }

    revalidatePath('/admin/locations');
    return { success: true, data };
  } catch (error) {
    return handleServerError(error, 'ERR_LOCATION_UPDATE_AUTH');
  }
}

export async function deleteLocation(id: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ Authorization check
    await requireAdmin(supabase);

    // Check if location is used by any games
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('id')
      .eq('location_id', id)
      .limit(1);

    if (gamesError) {
      return handleServerError(gamesError, 'ERR_LOCATION_DELETE_CHECK', 'Failed to check location usage.');
    }

    if (games && games.length > 0) {
      return { error: 'Cannot delete location: it is used by one or more games' };
    }

    const { error } = await supabase.from('locations').delete().eq('id', id);

    if (error) {
      return handleServerError(error, 'ERR_LOCATION_DELETE', 'Failed to delete location. Please try again.');
    }

    revalidatePath('/admin/locations');
    return { success: true };
  } catch (error) {
    return handleServerError(error, 'ERR_LOCATION_DELETE_AUTH');
  }
}

/**
 * Locations for the game create/edit form.
 *
 * Deliberately a server action rather than a browser query: fetching this
 * client-side pulled the ~200KB Supabase browser client into the bundle of
 * every page that can open the game form, including for visitors who never
 * open it. Public read access is allowed by RLS, so no admin check here — the
 * mutations above are what require authorization.
 */
export async function listLocations() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name');

    if (error) {
      return handleServerError(error, 'ERR_LOCATION_LIST', 'Failed to load locations.');
    }

    return { success: true as const, data: data ?? [] };
  } catch (error) {
    return handleServerError(error, 'ERR_LOCATION_LIST_AUTH');
  }
}
