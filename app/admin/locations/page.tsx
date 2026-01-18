import { redirect } from 'next/navigation';
import { Location } from '@/types';
import { getServerAuth } from '@/lib/auth-server';
import { createSupabaseServerClient } from '@/lib/auth-helpers';
import LocationsClient from './page-client';

export default async function LocationsPage() {
  const { isAdmin } = await getServerAuth();

  if (!isAdmin) {
    redirect('/');
  }

  const supabase = await createSupabaseServerClient();

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .order('name');

  return <LocationsClient locations={locations as Location[] || []} />;
}
