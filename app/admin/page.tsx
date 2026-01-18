import AdminClient from './components/AdminClient';
import { logger } from '@/lib/logger';
import { getServerAuth } from '@/lib/auth-server';
import { createSupabaseServerClient } from '@/lib/auth-helpers';

// This is a Server Component - it runs on the server and fetches data before rendering
export default async function AdminPage() {
  // Get auth state including role
  const { isAdmin, role } = await getServerAuth();
  const supabase = await createSupabaseServerClient();

  // Fetch players on the server before rendering
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    logger.error('Error fetching players', error);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AdminClient initialPlayers={players || []} canEdit={isAdmin} userRole={role} />
    </div>
  );
}
