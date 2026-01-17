'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Player } from '@/types';
import { formatCurrency, formatPlayerName } from '@/lib/utils';
import BackButton from '@/components/BackButton';
import { Crown, Download, FishSimple, DiamondsFour, Fire, Snowflake, ChartLineUp } from '@phosphor-icons/react';

type FilterType = 'all' | 'recent5' | 'month';

interface PlayerStats extends Player {
  rank: number;
  winRate: number;
  avgBuyIn: number;
  hotStreak?: boolean;
  coldStreak?: boolean;
}

interface StatsClientProps {
  players: Player[];
}

export default function StatsClient({ players }: StatsClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');

  // Calculate stats for each player
  const playerStats: PlayerStats[] = players.map(p => {
    const profit = p.totalOut - p.totalIn;
    const winRate = p.gamesPlayed > 0 ? (p.totalOut > p.totalIn ? 100 : 0) : 0;
    const avgBuyIn = p.gamesPlayed > 0 ? p.totalIn / p.gamesPlayed : 0;

    return {
      ...p,
      rank: 0,
      winRate,
      avgBuyIn,
    };
  });

  // Sort by profit and assign ranks
  const sortedStats = playerStats.sort((a, b) =>
    (b.totalOut - b.totalIn) - (a.totalOut - a.totalIn)
  );

  sortedStats.forEach((stat, index) => {
    stat.rank = index + 1;
  });

  const filteredStats = sortedStats.filter(stat => {
    if (filter === 'all') return true;
    if (filter === 'recent5') return stat.gamesPlayed > 0;
    if (filter === 'month') return stat.gamesPlayed > 0;
    return true;
  });

  const hasCompletedGames = sortedStats.some(stat => stat.gamesPlayed > 0);
  const showLeaderboard = hasCompletedGames;

  const getBadge = (stat: PlayerStats) => {
    const profit = stat.totalOut - stat.totalIn;

    if (stat.rank === 1 && profit > 0) return { icon: FishSimple, label: 'Shark', color: 'text-poker-gold' };
    if (stat.rank === filteredStats.length && profit < 0) return { icon: DiamondsFour, label: 'ATM', color: 'text-red-400' };
    if (stat.gamesPlayed >= 5) return { icon: ChartLineUp, label: 'Grinder', color: 'text-blue-400' };
    if (stat.avgBuyIn >= 30) return { icon: Crown, label: 'High Roller', color: 'text-purple-400' };
    if (stat.hotStreak) return { icon: Fire, label: 'Hot Streak', color: 'text-orange-400' };
    if (stat.coldStreak) return { icon: Snowflake, label: 'Cold Streak', color: 'text-cyan-400' };

    return null;
  };

  return (
    <>
      <BackButton />

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white drop-shadow-lg mb-2">
            High Rollers
          </h1>
          <p className="text-gray-400">Leaderboard and performance tracking</p>
        </div>
        <div className="glass-panel p-1 rounded-lg border border-white/10 flex items-center gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
              filter === 'all'
                ? 'bg-poker-felt text-white border border-poker-feltLight shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setFilter('recent5')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'recent5'
                ? 'bg-poker-felt text-white border border-poker-feltLight shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Last 5 Games
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'month'
                ? 'bg-poker-felt text-white border border-poker-feltLight shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            This Month
          </button>
        </div>
      </header>

      {/* Empty State - No Games */}
      {!showLeaderboard && (
        <div className="glass-panel p-12 text-center rounded-2xl">
          <Crown weight="fill" className="text-poker-gold text-6xl mx-auto mb-4 animate-gold-pulse" />
          <h3 className="text-2xl font-display font-bold text-white mb-2">NO STATISTICS YET</h3>
          <p className="text-gray-400 mb-6">
            Complete some games to see player rankings and statistics!
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-bold rounded-lg transition-all border border-yellow-200"
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {/* The Podium - Top 3 */}
      {showLeaderboard && filteredStats.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-12">
          {/* #2 Place */}
          <div className="order-2 md:order-1">
            <div className="glass-panel rounded-2xl p-6 flex flex-col items-center text-center relative border-t-4 border-t-gray-400 group hover:-translate-y-1 transition-transform">
              <div className="absolute -top-5 w-10 h-10 bg-gradient-to-b from-gray-300 to-gray-500 rounded-full flex items-center justify-center font-bold text-black border-2 border-white shadow-lg z-10">
                2
              </div>
              <div className="mt-4 mb-3 w-20 h-20 rounded-full border-2 border-gray-400 p-1 bg-black overflow-hidden">
                <Image
                  src={`/avatars/${filteredStats[1].avatar}`}
                  alt={formatPlayerName(filteredStats[1])}
                  width={80}
                  height={80}
                  className="w-full h-full rounded-full"
                  unoptimized
                />
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-1">
                {formatPlayerName(filteredStats[1])}
              </h3>
              <p className={`font-bold text-2xl font-display ${
                (filteredStats[1].totalOut - filteredStats[1].totalIn) >= 0 ? 'text-green-400' : 'text-poker-red'
              }`}>
                {(filteredStats[1].totalOut - filteredStats[1].totalIn) >= 0 ? '+' : ''}
                {formatCurrency(filteredStats[1].totalOut - filteredStats[1].totalIn)}
              </p>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                {filteredStats[1].winRate.toFixed(0)}% Win Rate
              </p>
            </div>
          </div>

          {/* #1 Place */}
          <div className="order-1 md:order-2 transform md:-translate-y-4">
            <div className="glass-panel bg-gradient-to-b from-poker-gold/10 to-transparent rounded-2xl p-8 flex flex-col items-center text-center relative border-t-4 border-t-poker-gold group shadow-[0_0_50px_rgba(212,175,55,0.15)]">
              <div className="absolute -top-8">
                <Crown weight="fill" className="text-5xl text-poker-gold drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] animate-bounce" />
              </div>
              <div className="mt-6 mb-4 w-28 h-28 rounded-full border-4 border-poker-gold p-1 shadow-[0_0_20px_rgba(212,175,55,0.3)] bg-black overflow-hidden">
                <Image
                  src={`/avatars/${filteredStats[0].avatar}`}
                  alt={formatPlayerName(filteredStats[0])}
                  width={112}
                  height={112}
                  className="w-full h-full rounded-full"
                  unoptimized
                />
              </div>
              <div className="bg-poker-gold/20 px-3 py-1 rounded-full border border-poker-gold/40 text-poker-gold text-xs font-bold uppercase tracking-widest mb-2">
                Chip Leader
              </div>
              <h3 className="font-display font-bold text-2xl text-white mb-1">
                {formatPlayerName(filteredStats[0])}
              </h3>
              <p className="text-green-400 font-bold text-4xl font-display mb-2 text-shadow-sm">
                +{formatCurrency(filteredStats[0].totalOut - filteredStats[0].totalIn)}
              </p>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>{filteredStats[0].winRate.toFixed(0)}% Win Rate</span>
                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                <span>{filteredStats[0].gamesPlayed} Games</span>
              </div>
            </div>
          </div>

          {/* #3 Place */}
          <div className="order-3 md:order-3">
            <div className="glass-panel rounded-2xl p-6 flex flex-col items-center text-center relative border-t-4 border-t-orange-700 group hover:-translate-y-1 transition-transform">
              <div className="absolute -top-5 w-10 h-10 bg-gradient-to-b from-orange-700 to-orange-900 rounded-full flex items-center justify-center font-bold text-white border-2 border-orange-300 shadow-lg z-10">
                3
              </div>
              <div className="mt-4 mb-3 w-20 h-20 rounded-full border-2 border-orange-700 p-1 bg-black overflow-hidden">
                <Image
                  src={`/avatars/${filteredStats[2].avatar}`}
                  alt={formatPlayerName(filteredStats[2])}
                  width={80}
                  height={80}
                  className="w-full h-full rounded-full"
                  unoptimized
                />
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-1">
                {formatPlayerName(filteredStats[2])}
              </h3>
              <p className={`font-bold text-2xl font-display ${
                (filteredStats[2].totalOut - filteredStats[2].totalIn) >= 0 ? 'text-green-400' : 'text-poker-red'
              }`}>
                {(filteredStats[2].totalOut - filteredStats[2].totalIn) >= 0 ? '+' : ''}
                {formatCurrency(filteredStats[2].totalOut - filteredStats[2].totalIn)}
              </p>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                {filteredStats[2].winRate.toFixed(0)}% Win Rate
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      {showLeaderboard && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-display font-bold text-xl text-white">Full Leaderboard</h3>
            <button className="text-gray-400 hover:text-white text-sm flex items-center gap-2 transition-colors">
              <Download size={16} weight="bold" />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-white/5 bg-black/20">
                  <th className="p-4 font-medium">Rank</th>
                  <th className="p-4 font-medium">Grinder</th>
                  <th className="p-4 font-medium text-center">Hands</th>
                  <th className="p-4 font-medium text-right">Net</th>
                  <th className="p-4 font-medium text-center hidden md:table-cell">Win %</th>
                  <th className="p-4 font-medium text-right hidden md:table-cell">Best Pot</th>
                  <th className="p-4 font-medium text-center">Badges</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredStats.map((stat) => {
                  const profit = stat.totalOut - stat.totalIn;
                  const badge = getBadge(stat);

                  return (
                    <tr
                      key={stat.id}
                      className="border-b border-white/5 transition-colors hover:bg-white/5"
                    >
                      {/* Rank */}
                      <td className="p-4">
                        <div className={`w-8 h-8 rounded flex items-center justify-center font-bold ${
                          stat.rank === 1 ? 'bg-poker-gold/10 text-poker-gold border border-poker-gold/20' :
                          stat.rank === 2 ? 'bg-gray-400/10 text-gray-400 border border-gray-400/20' :
                          stat.rank === 3 ? 'bg-orange-700/10 text-orange-400 border border-orange-700/20' :
                          'text-gray-500'
                        }`}>
                          {stat.rank}
                        </div>
                      </td>

                      {/* Player */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Image
                            src={`/avatars/${stat.avatar}`}
                            alt={formatPlayerName(stat)}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full border border-gray-600"
                            unoptimized
                          />
                          <span className="font-bold text-white font-display">
                            {formatPlayerName(stat)}
                          </span>
                        </div>
                      </td>

                      {/* Games */}
                      <td className="p-4 text-center text-gray-300">{stat.gamesPlayed}</td>

                      {/* Profit */}
                      <td className={`p-4 text-right font-bold text-base ${
                        profit >= 0 ? 'text-green-400 bg-green-400/5' : 'text-poker-red bg-poker-red/5'
                      }`}>
                        {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                      </td>

                      {/* Win Rate */}
                      <td className="p-4 text-center text-white hidden md:table-cell">
                        {stat.winRate.toFixed(0)}%
                      </td>

                      {/* Biggest Win */}
                      <td className="p-4 text-right text-green-400 hidden md:table-cell">
                        +{formatCurrency(stat.biggestWin)}
                      </td>

                      {/* Badges */}
                      <td className="p-4 text-center">
                        {badge && (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-xs font-bold border border-white/10 ${badge.color}`}>
                            <badge.icon weight="fill" size={14} />
                            {badge.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State - Filtered Results */}
      {showLeaderboard && filteredStats.length === 0 && (
        <div className="glass-panel p-12 text-center rounded-2xl">
          <ChartLineUp weight="fill" className="text-poker-gold text-6xl mx-auto mb-4" />
          <h3 className="text-2xl font-display font-bold text-white mb-2">No Statistics Yet</h3>
          <p className="text-gray-400 mb-6">
            Play some games to see player statistics and leaderboards!
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-bold rounded-lg transition-all border border-yellow-200"
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </>
  );
}
