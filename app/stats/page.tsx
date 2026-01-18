import { Player } from '@/types';
import StatsClient from './page-client';
import { createSupabaseServerClient } from '@/lib/auth-helpers';

export default async function StatsPage() {
  const supabase = await createSupabaseServerClient();

  // Fetch all players
  const { data: playersData } = await supabase
    .from('players')
    .select('*');

  const players: Player[] = (playersData || []).map(p => ({
    ...p,
    name: `${p.first_name}${p.nickname ? ` "${p.nickname}"` : ''} ${p.last_name}`.trim()
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <StatsClient players={players} />
    </div>
  );
}
