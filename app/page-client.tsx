'use client';

import { useState } from 'react';
import { Game, Player, GamePlayer, RSVP } from '@/types';
import { formatDate, formatTime, formatCurrency, formatPlayerName } from '@/lib/utils';
import Card from '@/components/Card';
import Button from '@/components/Button';
import GameCard from '@/components/GameCard';
import CreateGameModal from '@/components/CreateGameModal';

interface HomeClientProps {
  games: Game[];
  players: Player[];
  gamePlayers: GamePlayer[];
  rsvps: RSVP[];
}

export default function HomeClient({ games, players, gamePlayers, rsvps }: HomeClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Helper function to get RSVP counts for a game
  const getRsvpCounts = (gameId: string) => {
    const gameRsvps = rsvps.filter(r => r.gameId === gameId);
    const confirmed = gameRsvps.filter(r => r.status === 'confirmed').length;
    const waitlist = gameRsvps.filter(r => r.status === 'waitlist').length;
    return { confirmed, waitlist };
  };

  // Calculate quick stats from real data
  const totalGamesHosted = games.length;
  const completedGames = games.filter(g => g.status === 'completed');
  const totalMoneyPlayed = completedGames.reduce((sum, game) => sum + game.buyIn, 0);

  // Find chip leader
  let chipLeader: { player: Player; profit: number } | null = null;
  if (players.length > 0) {
    const sortedByProfit = [...players].sort((a, b) => (b.totalOut - b.totalIn) - (a.totalOut - a.totalIn));
    const leader = sortedByProfit[0];
    if (leader && (leader.totalOut - leader.totalIn) > 0) {
      chipLeader = {
        player: leader,
        profit: leader.totalOut - leader.totalIn
      };
    }
  }

  // Find next upcoming game
  const upcomingGames = games
    .filter(g => g.status === 'upcoming')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextGameDate = upcomingGames[0]?.date || null;

  const quickStats = {
    totalGamesHosted,
    totalMoneyPlayed,
    chipLeader,
    nextGameDate
  };

  // Helper to check if a game should be live based on its scheduled time
  const isGameLive = (game: Game) => {
    if (game.status === 'in_progress') return true;
    if (game.status === 'completed') return false;

    // Check if scheduled time has passed (game should be live)
    const gameDateTime = new Date(`${game.date}T${game.time}`);
    const now = new Date();
    return gameDateTime <= now;
  };

  // Separate games into live, upcoming, and completed
  const allUpcomingAndInProgress = games.filter(g => g.status !== 'completed');
  const liveGames = allUpcomingAndInProgress.filter(isGameLive);
  const upcomingGamesList = allUpcomingAndInProgress
    .filter(g => !isGameLive(g))
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
  const recentGames = games.filter(g => g.status === 'completed').slice(0, 5);

  return (
    <>
      {/* Hero Section - Full Width Green Felt */}
      <div className="bg-gradient-to-br from-green-700 via-green-600 to-green-800 dark:from-green-800 dark:via-green-700 dark:to-green-900 py-16 px-4 sm:px-6 lg:px-8 pb-32">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            The Ultimate Poker CMS
          </h1>
          <p className="text-white/90 text-lg md:text-xl max-w-3xl mx-auto">
            Organize your home poker games with automatic RSVPs and real-time tracking
          </p>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Quick Stats - Overlapping Hero */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-16 mb-12 relative z-10">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Games</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{quickStats.totalGamesHosted} Total Games</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Pot</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(quickStats.totalMoneyPlayed)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Current Leader</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white truncate">
                  {quickStats.chipLeader ? formatPlayerName(quickStats.chipLeader.player) : '-'}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Next Game</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {quickStats.nextGameDate ? formatDate(quickStats.nextGameDate).split(',')[0] + ' ' + formatTime(upcomingGames[0]?.time || '') : 'TBD'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Live Games */}
        {liveGames.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Live Games</h3>
              </div>
            </div>
            <div className="grid gap-6">
              {liveGames.map(game => {
                const { confirmed, waitlist } = getRsvpCounts(game.id);
                return <GameCard key={game.id} game={game} confirmedCount={confirmed} waitlistCount={waitlist} />;
              })}
            </div>
          </div>
        )}

        {/* Upcoming Games */}
        {upcomingGamesList.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Upcoming Games</h3>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
              {upcomingGamesList.map(game => {
                const { confirmed, waitlist } = getRsvpCounts(game.id);
                return <GameCard key={game.id} game={game} confirmedCount={confirmed} waitlistCount={waitlist} />;
              })}
            </div>
          </div>
        )}

        {/* Past Games */}
        {recentGames.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Games</h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentGames.map(game => {
                const { confirmed, waitlist } = getRsvpCounts(game.id);
                return <GameCard key={game.id} game={game} compact confirmedCount={confirmed} waitlistCount={waitlist} />;
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {games.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-6xl mb-4">🎴</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Games Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by hosting your first poker night!</p>
            <Button onClick={() => setShowCreateModal(true)}>
              Host Your First Game
            </Button>
          </Card>
        )}

      </div>
      {/* End Content Container */}

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-8 right-8 flex items-center gap-2 px-6 py-3 bg-poker-green hover:bg-green-700 dark:hover:bg-green-600 text-white rounded-full shadow-2xl hover:shadow-xl transition-all duration-200 z-30 hover:scale-105 font-semibold"
        aria-label="Host New Game"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>Host New Game</span>
      </button>

      {/* Create Game Modal */}
      <CreateGameModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
}
