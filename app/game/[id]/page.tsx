import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Game, RSVP, Player } from '@/types';
import GameDetailClient from './page-client';

interface GamePageProps {
  params: { id: string };
}

export default async function GameDetailPage({ params }: GamePageProps) {
  const gameId = params.id;
  const cookieStore = cookies();

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
  console.log('[Game Page] Query results:', {
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
    console.error('[Game Page] Game not found:', { gameId, error: gameRes.error });
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400">Game not found</p>
        {gameRes.error && (
          <p className="text-red-400 text-sm mt-2">{gameRes.error.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <GameDetailClient
        game={game}
        initialRSVPs={rsvps}
        players={players}
      />
    </div>
  );
}
