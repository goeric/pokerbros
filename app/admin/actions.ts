'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Helper to create Supabase server client
function createSupabaseServerClient() {
  const cookieStore = cookies();

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
            // Ignore cookie errors in server actions
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name);
          } catch (error) {
            // Ignore cookie errors in server actions
          }
        },
      },
    }
  );
}

export async function createPlayer(formData: FormData) {
  const supabase = createSupabaseServerClient();

  const first_name = formData.get('first_name') as string;
  const last_name = formData.get('last_name') as string;
  const nickname = formData.get('nickname') as string;
  const email = formData.get('email') as string;

  const { error } = await supabase
    .from('players')
    .insert({
      first_name,
      last_name,
      nickname: nickname || null,
      email,
      totalIn: 0,
      totalOut: 0,
      gamesPlayed: 0,
      biggestWin: 0,
      biggestLoss: 0,
    });

  if (error) {
    console.error('Error creating player:', error);
    return { error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function updatePlayer(playerId: string, formData: FormData) {
  const supabase = createSupabaseServerClient();

  const first_name = formData.get('first_name') as string;
  const last_name = formData.get('last_name') as string;
  const nickname = formData.get('nickname') as string;
  const email = formData.get('email') as string;

  const { error } = await supabase
    .from('players')
    .update({
      first_name,
      last_name,
      nickname: nickname || null,
      email,
    })
    .eq('id', playerId);

  if (error) {
    console.error('Error updating player:', error);
    return { error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function deletePlayer(playerId: string) {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId);

  if (error) {
    console.error('Error deleting player:', error);
    return { error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}
