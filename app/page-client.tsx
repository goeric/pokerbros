'use client';

import { useState } from 'react';
import { Game, Player, GamePlayer, RSVP } from '@/types';
import { formatDate, formatTime, formatCurrency, formatPlayerName } from '@/lib/utils';
import Card from '@/components/Card';
import Button from '@/components/Button';
import GameCard from '@/components/GameCard';
import CreateGameModal from '@/components/CreateGameModal';
import { Spade, CurrencyDollar, Trophy, CalendarDots, Plus } from '@phosphor-icons/react';
import FeaturedGameCard from '@/components/FeaturedGameCard';

interface HomeClientProps {
  games: Game[];
  players: Player[];
  gamePlayers: GamePlayer[];
  rsvps: RSVP[];
  isAdmin: boolean;
}

export default function HomeClient({ games, players, gamePlayers, rsvps, isAdmin }: HomeClientProps) {
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

  // Calculate actual money played by summing all buy-ins from game_players
  const completedGameIds = new Set(completedGames.map(g => g.id));
  const completedGamePlayers = gamePlayers.filter(gp => completedGameIds.has(gp.gameId));
  const totalMoneyPlayed = completedGamePlayers.reduce((sum, gp) => {
    // Sum all buy-ins for this player (buyIns is an array)
    const playerTotal = gp.buyIns.reduce((acc, buyIn) => acc + buyIn, 0);
    return sum + playerTotal;
  }, 0);

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
      {/* Content Container - Full Width Dashboard */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-8 pt-8">
        {/* Quick Stats - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Hands Dealt / Total Games */}
          <div className="glass-panel p-6 rounded-2xl">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Hands Dealt</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-display font-bold text-white">{quickStats.totalGamesHosted}</p>
              <p className="text-gray-400 font-medium">Game{quickStats.totalGamesHosted !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Season Pot */}
          <div className="glass-panel p-6 rounded-2xl">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Season Pot</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-display font-bold text-poker-gold">
                {formatCurrency(quickStats.totalMoneyPlayed)}
              </p>
            </div>
            <p className="text-gray-500 text-xs mt-2">House rake: $0</p>
          </div>

          {/* Chip Leader */}
          <div className="glass-panel p-6 rounded-2xl">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Chip Leader</p>
            <div className="flex items-center gap-3">
              {quickStats.chipLeader ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-poker-gold to-yellow-700 flex items-center justify-center border-2 border-yellow-200">
                    <Trophy weight="fill" className="text-black" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-white truncate">
                      {quickStats.chipLeader.player.first_name} {quickStats.chipLeader.player.last_name}
                    </p>
                    <p className="text-xs text-gray-400">Waiting for results</p>
                  </div>
                </>
              ) : (
                <p className="text-gray-400">-</p>
              )}
            </div>
          </div>
        </div>

        {/* Main Dashboard Layout - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Left Column - Featured Next Deal or Live Game */}
          <div className="lg:col-span-2">
            {liveGames.length > 0 ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <Spade weight="fill" className="text-poker-gold" size={24} />
                  <h2 className="text-3xl font-display font-bold text-white">Next Deal</h2>
                </div>
                <FeaturedGameCard
                  game={liveGames[0]}
                  confirmedCount={getRsvpCounts(liveGames[0].id).confirmed}
                  onRsvp={() => window.location.href = `/game/${liveGames[0].id}/live`}
                />
              </>
            ) : upcomingGamesList.length > 0 ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <Spade weight="fill" className="text-poker-gold" size={24} />
                  <h2 className="text-3xl font-display font-bold text-white">Next Deal</h2>
                </div>
                <FeaturedGameCard
                  game={upcomingGamesList[0]}
                  confirmedCount={getRsvpCounts(upcomingGamesList[0].id).confirmed}
                  onRsvp={() => window.location.href = `/game/${upcomingGamesList[0].id}`}
                />
              </>
            ) : (
              <div className="glass-panel p-12 text-center rounded-2xl">
                <Spade weight="fill" className="text-poker-gold text-6xl mx-auto mb-4 animate-gold-pulse" />
                <h3 className="text-2xl font-display font-bold text-white mb-2">NO GAMES SCHEDULED</h3>
                <p className="text-gray-400 mb-6">
                  {isAdmin ? 'Create a new game to get started!' : 'Check back soon for upcoming games!'}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Future Games Sidebar */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-white">Future Games</h2>
              {upcomingGamesList.length > 1 && (
                <span className="text-poker-gold text-sm font-bold uppercase tracking-wide">View All</span>
              )}
            </div>
            <div className="space-y-4">
              {upcomingGamesList.slice(liveGames.length > 0 ? 0 : 1, 4).map(game => {
                const { confirmed, waitlist } = getRsvpCounts(game.id);
                return (
                  <a key={game.id} href={`/game/${game.id}`} className="block glass-panel p-4 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarDots weight="bold" className="text-poker-gold" size={16} />
                          <p className="font-display font-bold text-white text-sm">
                            {formatDate(game.date).split(',')[1].trim()}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400">
                          {formatTime(game.time)} • {formatCurrency(game.buyIn)}
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                          {[...Array(Math.min(8, confirmed))].map((_, i) => (
                            <div key={i} className="w-1 h-1 rounded-full bg-poker-gold" />
                          ))}
                          {[...Array(Math.max(0, 8 - confirmed))].map((_, i) => (
                            <div key={i} className="w-1 h-1 rounded-full bg-gray-700" />
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">
                          {formatDate(game.date).split(',')[0]}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(game.date).split(',')[1].split(' ')[1]}</p>
                      </div>
                    </div>
                  </a>
                );
              })}
              {upcomingGamesList.length === 0 && (
                <div className="glass-panel p-6 text-center rounded-xl">
                  <p className="text-gray-400 text-sm">No upcoming games</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Games - Simplified */}
        {recentGames.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-display font-bold text-white mb-6">Recent Games</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {recentGames.slice(0, 3).map(game => {
                const { confirmed, waitlist } = getRsvpCounts(game.id);
                return <GameCard key={game.id} game={game} compact confirmedCount={confirmed} waitlistCount={waitlist} />;
              })}
            </div>
          </div>
        )}
      </div>
      {/* End Content Container */}

      {/* Floating Action Button - Admin Only */}
      {isAdmin && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-8 right-8 flex items-center gap-2 px-6 py-4 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold rounded-full shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_40px_rgba(212,175,55,0.6)] transition-all duration-200 z-30 hover:scale-105 border border-yellow-200"
          aria-label="Host New Game"
        >
          <Plus weight="bold" className="text-xl" />
          <span className="tracking-wide">HOST NEW GAME</span>
        </button>
      )}

      {/* Create Game Modal */}
      <CreateGameModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
}
