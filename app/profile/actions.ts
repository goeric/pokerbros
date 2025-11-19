'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { NotificationPreferences } from '@/types';

export async function updateProfile(playerId: string, updates: { nickname?: string }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
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

  const { error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', playerId);

  if (error) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }

  revalidatePath('/profile');
  revalidatePath('/');
}

export async function updateAvatar(playerId: string, avatar: string) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
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

  const { error } = await supabase
    .from('players')
    .update({ avatar })
    .eq('id', playerId);

  if (error) {
    console.error('Error updating avatar:', error);
    throw new Error('Failed to update avatar');
  }

  revalidatePath('/profile');
  revalidatePath('/');
}

export async function updateNotificationPreferences(
  playerId: string,
  preferences: NotificationPreferences
) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
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

  const { error } = await supabase
    .from('players')
    .update({ notification_preferences: preferences })
    .eq('id', playerId);

  if (error) {
    console.error('Error updating notification preferences:', error);
    throw new Error('Failed to update notification preferences');
  }

  revalidatePath('/profile');
}
