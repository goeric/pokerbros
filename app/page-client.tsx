'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Game, Player, GamePlayer, RSVP } from '@/types';
import { formatDateWithDay, formatTime, formatCurrency, formatPlayerName } from '@/lib/utils';
import GameCard from '@/components/GameCard';
import CreateGameModal from '@/components/CreateGameModal';
import { Spade, CalendarDots, Plus } from '@phosphor-icons/react';
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-6">
        {/* Page Header */}
        <div className="mb-6">
          {/* Season Status */}
          {liveGames.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-poker-red rounded-full animate-pulse"></div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Season 1 - Live
              </p>
            </div>
          )}

          {/* Page Title + Host Button */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-display font-bold text-white">The Floor</h1>

            {/* Host New Game Button - Desktop */}
            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="hidden md:flex items-center gap-2 px-6 py-3 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold rounded-xl transition-all duration-200 border border-yellow-200 shadow-lg hover:scale-105"
              >
                <Plus weight="bold" size={20} />
                <span className="tracking-wide">HOST NEW GAME</span>
              </button>
            )}
          </div>

          {/* New Table Button - Mobile Only */}
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="md:hidden w-full py-3 px-4 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold rounded-xl transition-all duration-200 border border-yellow-200 shadow-lg flex items-center justify-center gap-2 mb-4"
            >
              <Plus weight="bold" className="text-xl" />
              <span className="tracking-wide">New Table</span>
            </button>
          )}
        </div>

        {/* Quick Stats - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Hands Dealt / Total Games */}
          <div className="glass-panel p-5 rounded-2xl">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Hands Dealt</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-display font-bold text-white">{quickStats.totalGamesHosted}</p>
              <p className="text-gray-400 font-medium">Game{quickStats.totalGamesHosted !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Season Pot */}
          <div className="glass-panel p-5 rounded-2xl">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Season Pot</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-display font-bold text-poker-gold">
                {formatCurrency(quickStats.totalMoneyPlayed)}
              </p>
            </div>
          </div>

          {/* Chip Leader */}
          <div className="glass-panel p-5 rounded-2xl">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Chip Leader</p>
            <div className="flex items-center gap-3">
              {quickStats.chipLeader ? (
                <>
                  <Image
                    src={`/avatars/${quickStats.chipLeader.player.avatar}`}
                    alt={formatPlayerName(quickStats.chipLeader.player)}
                    width={40}
                    height={40}
                    unoptimized
                    className="w-10 h-10 rounded-full border-2 border-poker-gold shadow-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-white truncate">
                      {formatPlayerName(quickStats.chipLeader.player)}
                    </p>
                    <p className="text-xs text-poker-gold">
                      +{formatCurrency(quickStats.chipLeader.profit)}
                    </p>
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
                  confirmedPlayers={rsvps
                    .filter(r => r.gameId === liveGames[0].id && r.status === 'confirmed')
                    .map(r => players.find(p => p.id === r.playerId))
                    .filter((p): p is Player => p !== undefined)}
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
                  confirmedPlayers={rsvps
                    .filter(r => r.gameId === upcomingGamesList[0].id && r.status === 'confirmed')
                    .map(r => players.find(p => p.id === r.playerId))
                    .filter((p): p is Player => p !== undefined)}
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
                const dateWithDay = formatDateWithDay(game.date); // e.g., "Fri, Jan 16"
                const [dayOfWeek, monthDay] = dateWithDay.split(','); // ["Fri", " Jan 16"]

                // Get confirmed players for this game
                const confirmedPlayers = rsvps
                  .filter(r => r.gameId === game.id && r.status === 'confirmed')
                  .map(r => players.find(p => p.id === r.playerId))
                  .filter((p): p is Player => p !== undefined);

                return (
                  <a key={game.id} href={`/game/${game.id}`} className="block glass-panel p-4 rounded-xl hover:bg-white/5 transition-colors border border-white/5 hover:border-poker-gold/30">
                    <div className="space-y-3">
                      {/* Day of Week + Date */}
                      <div>
                        <p className="text-xs uppercase tracking-wider text-poker-gold font-bold mb-1">
                          {dayOfWeek}
                        </p>
                        <div className="flex items-center gap-2">
                          <CalendarDots weight="bold" className="text-poker-gold" size={18} />
                          <p className="font-display font-bold text-white text-lg">
                            {monthDay.trim()}
                          </p>
                        </div>
                      </div>

                      {/* Time & Buy-in */}
                      <p className="text-sm text-gray-400">
                        {formatTime(game.time)} • {formatCurrency(game.buyIn)}
                      </p>

                      {/* Player Avatars */}
                      {confirmedPlayers.length > 0 && (
                        <div className="flex -space-x-2 flex-wrap gap-y-1">
                          {confirmedPlayers.slice(0, 8).map((player, idx) => (
                            <Image
                              key={player.id}
                              src={`/avatars/${player.avatar}`}
                              alt={formatPlayerName(player)}
                              title={formatPlayerName(player)}
                              width={28}
                              height={28}
                              unoptimized
                              className="w-7 h-7 rounded-full border-2 border-gray-900 bg-gray-800 shadow-lg"
                              style={{ zIndex: 80 - idx * 10 }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Seat Indicator */}
                      <div className="flex items-center gap-1">
                        {[...Array(Math.min(8, confirmed))].map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-poker-gold" />
                        ))}
                        {[...Array(Math.max(0, 8 - confirmed))].map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                        ))}
                      </div>
                    </div>
                  </a>
                );
              })}
              {upcomingGamesList.length === 0 && (
                <div className="glass-panel p-8 text-center rounded-xl border border-white/10">
                  <CalendarDots weight="bold" className="text-poker-gold/50 mx-auto mb-3" size={40} />
                  <p className="text-gray-400 text-sm font-medium mb-1">No future games</p>
                  <p className="text-gray-500 text-xs">Check back soon</p>
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

      {/* Create Game Modal */}
      <CreateGameModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
}
