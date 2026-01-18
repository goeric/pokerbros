import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerAuth } from '@/lib/auth-server';
import { createSupabaseServerClient } from '@/lib/auth-helpers';
import { Player, Game, GamePlayer } from '@/types';
import ProfileClient from './page-client';

export default async function ProfilePage() {
  const { user, isAdmin } = await getServerAuth();

  // Redirect if not logged in
  if (!user) {
    redirect('/login');
  }

  const supabase = await createSupabaseServerClient();

  // Fetch player data by email
  const { data: playerData } = await supabase
    .from('players')
    .select('*')
    .eq('email', user.email)
    .single();

  if (!playerData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🎴</p>
        <h2 className="text-2xl font-bold text-white mb-2">Player Not Found</h2>
        <p className="text-gray-400 mb-6">
          You need to be added as a player to access your profile.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-poker-green hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const player: Player = {
    ...playerData,
    avatar: playerData.avatar || 'avatar1.svg',
    notification_preferences: playerData.notification_preferences || {
      game_created: true,
      game_updated: true,
      game_cancelled: true,
      rsvp_confirmed: true,
      rsvp_cancelled: false,
      waitlist_promoted: true,
      game_reminder_24h: true,
      game_reminder_3h: true,
    },
  };

  // Fetch player's game history
  const { data: gamePlayersData } = await supabase
    .from('game_players')
    .select('*, games(*)')
    .eq('playerId', player.id)
    .order('games(date)', { ascending: false });

  const gameHistory = (gamePlayersData || []).map((gp: any) => ({
    gamePlayer: gp as GamePlayer,
    game: gp.games as Game,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProfileClient player={player} gameHistory={gameHistory} />
    </div>
  );
}
