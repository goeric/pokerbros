'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

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
            // Ignore
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name);
          } catch (error) {
            // Ignore
          }
        },
      },
    }
  );
}

export async function createGame(gameData: {
  date: string;
  time: string;
  buyIn: number;
  venue: string;
  notes: string;
}) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('games')
    .insert({
      date: gameData.date,
      time: gameData.time,
      buyIn: gameData.buyIn,
      venue: gameData.venue,
      status: 'upcoming',
      notes: gameData.notes || null,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  return { success: true, data };
}
