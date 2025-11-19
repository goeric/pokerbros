'use client';

import { useState } from 'react';
import { Game, Player, GamePlayer, RSVP } from '@/types';
import { formatDate, formatTime, formatCurrency, formatPlayerName } from '@/lib/utils';
import Card from '@/components/Card';
import Button from '@/components/Button';
import GameCard from '@/components/GameCard';
import CreateGameModal from '@/components/CreateGameModal';
import { Spade, CurrencyDollar, Trophy, CalendarDots, Plus } from '@phosphor-icons/react';

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
      {/* Hero Section - Casino Style */}
      <div className="relative py-16 px-4 sm:px-6 lg:px-8 pb-32 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 w-[600px] h-[400px] bg-poker-gold/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Spade weight="fill" className="text-poker-gold text-5xl md:text-6xl animate-gold-pulse" />
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            NEVER MISS A{' '}
            <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-poker-gold via-poker-goldlight to-poker-gold">
              FULL TABLE
            </span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-3xl mx-auto">
            Organize your home poker games with automatic RSVPs and real-time tracking
          </p>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Quick Stats - Casino Glass Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-16 mb-12 relative z-10">
          {/* Total Games */}
          <div className="glass-panel glass-card-hover p-6 rounded-2xl">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-poker-gold/10 flex items-center justify-center border border-poker-gold/20">
                <Spade weight="fill" className="text-poker-gold text-2xl" />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1 uppercase tracking-wide">Total Games</p>
                <p className="text-3xl font-display font-bold text-white">{quickStats.totalGamesHosted}</p>
              </div>
            </div>
          </div>

          {/* Total Pot */}
          <div className="glass-panel glass-card-hover p-6 rounded-2xl">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-poker-gold/10 flex items-center justify-center border border-poker-gold/20">
                <CurrencyDollar weight="bold" className="text-poker-gold text-2xl" />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1 uppercase tracking-wide">Total Pot</p>
                <p className="text-3xl font-display font-bold text-white">
                  {formatCurrency(quickStats.totalMoneyPlayed)}
                </p>
              </div>
            </div>
          </div>

          {/* Current Leader */}
          <div className="glass-panel glass-card-hover p-6 rounded-2xl">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-poker-gold/10 flex items-center justify-center border border-poker-gold/20">
                <Trophy weight="fill" className="text-poker-gold text-2xl" />
              </div>
              <div className="min-w-0">
                <p className="text-gray-400 text-sm mb-1 uppercase tracking-wide">Current Leader</p>
                <p className="text-xl font-display font-bold text-white truncate" title={quickStats.chipLeader ? formatPlayerName(quickStats.chipLeader.player) : ''}>
                  {quickStats.chipLeader ? `${quickStats.chipLeader.player.first_name} ${quickStats.chipLeader.player.last_name}` : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Next Game */}
          <div className="glass-panel glass-card-hover p-6 rounded-2xl">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-poker-gold/10 flex items-center justify-center border border-poker-gold/20">
                <CalendarDots weight="bold" className="text-poker-gold text-2xl" />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1 uppercase tracking-wide">Next Game</p>
                <p className="text-lg font-display font-bold text-white">
                  {quickStats.nextGameDate ? formatDate(quickStats.nextGameDate).split(',')[0] + ' ' + formatTime(upcomingGames[0]?.time || '') : 'TBD'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Games */}
        {liveGames.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-poker-red rounded-full animate-pulse shadow-[0_0_10px_rgba(217,40,40,0.5)]"></div>
                <h3 className="text-2xl font-display font-bold text-white tracking-tight">LIVE NOW</h3>
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
            <h3 className="text-2xl font-display font-bold text-white mb-6 tracking-tight">UPCOMING GAMES</h3>
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
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-display font-bold text-white tracking-tight">RECENT GAMES</h3>
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
          <div className="glass-panel p-12 text-center rounded-2xl">
            <Spade weight="fill" className="text-poker-gold text-6xl mx-auto mb-4 animate-gold-pulse" />
            <h3 className="text-2xl font-display font-bold text-white mb-2">NO GAMES YET</h3>
            <p className="text-gray-400 mb-6">
              {isAdmin ? 'Get started by hosting your first poker night!' : 'Check back soon for upcoming games!'}
            </p>
            {isAdmin && (
              <Button onClick={() => setShowCreateModal(true)}>
                Host Your First Game
              </Button>
            )}
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
