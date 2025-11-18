import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Game, RSVP, Player } from '@/types';
import GameDetailClient from './page-client';
import { getServerAuth } from '@/lib/auth-server';
import { logger } from '@/lib/logger';

interface GamePageProps {
  params: Promise<{ id: string }>;
}

export default async function GameDetailPage({ params }: GamePageProps) {
  const { id: gameId } = await params;
  const cookieStore = await cookies();

  // Get auth state server-side
  const { user, isAdmin } = await getServerAuth();

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

  // Fetch all data in parallel on the server
  const [gameRes, rsvpsRes, playersRes] = await Promise.all([
    supabase.from('games').select('*').eq('id', gameId).single(),
    supabase.from('rsvps').select('*').eq('gameId', gameId),
    supabase.from('players').select('*'),
  ]);

  // Debug logging
  logger.debug('[Game Page] Query results', {
    gameId,
    gameData: gameRes.data,
    gameError: gameRes.error,
    rsvpsCount: rsvpsRes.data?.length,
    playersCount: playersRes.data?.length,
  });

  const game = gameRes.data;
  const rsvps: RSVP[] = rsvpsRes.data || [];
  const players: Player[] = (playersRes.data || []).map(p => ({
    ...p,
    name: `${p.first_name} ${p.last_name}${p.nickname ? ` '${p.nickname}'` : ''}`
  }));

  if (!game) {
    logger.warn('[Game Page] Game not found (may have been deleted)', { gameId });
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🎴</p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Game Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This game may have been deleted or doesn't exist.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-poker-green hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          Back to Home
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <GameDetailClient
        game={game}
        initialRSVPs={rsvps}
        players={players}
        user={user}
        isAdmin={isAdmin}
      />
    </div>
  );
}
