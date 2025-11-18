import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Location } from '@/types';
import { getServerAuth } from '@/lib/auth-server';
import LocationsClient from './page-client';

export default async function LocationsPage() {
  const { isAdmin } = await getServerAuth();

  if (!isAdmin) {
    redirect('/');
  }

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
            // Ignore cookie errors in server components
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name);
          } catch (error) {
            // Ignore cookie errors in server components
          }
        },
      },
    }
  );

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .order('name');

  return <LocationsClient locations={locations as Location[] || []} />;
}
