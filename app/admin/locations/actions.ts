'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServerAuth } from '@/lib/auth-server';

async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Ignore errors in Server Actions
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name);
          } catch (error) {
            // Ignore errors in Server Actions
          }
        },
      },
    }
  );
}

export async function createLocation(formData: { name: string; address: string }) {
  try {
    const { isAdmin } = await getServerAuth();
    if (!isAdmin) {
      return { error: 'Unauthorized: Admin access required' };
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('locations')
      .insert({
        name: formData.name,
        address: formData.address,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin/locations');
    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating location:', error);
    return { error: error.message || 'Failed to create location' };
  }
}

export async function updateLocation(id: string, formData: { name: string; address: string }) {
  try {
    const { isAdmin } = await getServerAuth();
    if (!isAdmin) {
      return { error: 'Unauthorized: Admin access required' };
    }

    const supabase = await createSupabaseServerClient();

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

    if (error) throw error;

    revalidatePath('/admin/locations');
    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating location:', error);
    return { error: error.message || 'Failed to update location' };
  }
}

export async function deleteLocation(id: string) {
  try {
    const { isAdmin } = await getServerAuth();
    if (!isAdmin) {
      return { error: 'Unauthorized: Admin access required' };
    }

    const supabase = await createSupabaseServerClient();

    // Check if location is used by any games
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('id')
      .eq('location_id', id)
      .limit(1);

    if (gamesError) throw gamesError;

    if (games && games.length > 0) {
      return { error: 'Cannot delete location: it is used by one or more games' };
    }

    const { error } = await supabase.from('locations').delete().eq('id', id);

    if (error) throw error;

    revalidatePath('/admin/locations');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting location:', error);
    return { error: error.message || 'Failed to delete location' };
  }
}
