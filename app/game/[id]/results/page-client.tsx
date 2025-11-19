'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Game, GamePlayer, Player } from '@/types';
import { formatCurrency, formatDate, formatTime, formatPlayerName } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import BackButton from '@/components/BackButton';
import { Trophy, Crown, ShareNetwork, House, Users, Fire, TrendUp, ChartBar } from '@phosphor-icons/react';

interface ResultsClientProps {
  game: Game;
  gamePlayers: GamePlayer[];
  players: Player[];
  isAdmin: boolean;
}

export default function ResultsClient({
  game,
  gamePlayers,
  players,
  isAdmin,
}: ResultsClientProps) {
  const router = useRouter();

  useEffect(() => {
    // Trigger confetti on load
    setTimeout(() => triggerConfetti(), 500);
  }, []);

  const handleShareResults = () => {
    let text = `🎴 Poker Night Results - ${formatDate(game.date)}\n\n`;

    gamePlayers.forEach((gp, index) => {
      const player = players.find(p => p.id === gp.playerId);
      if (player) {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
        const playerName = formatPlayerName(player);
        text += `${medal} ${playerName}: ${gp.profit >= 0 ? '+' : ''}${formatCurrency(gp.profit)}\n`;
      }
    });

    navigator.clipboard.writeText(text);
    alert('Results copied to clipboard!');
  };

  const winner = gamePlayers[0];
  const loser = gamePlayers[gamePlayers.length - 1];
  const totalPot = gamePlayers.reduce((sum, gp) =>
    sum + gp.buyIns.reduce((s, b) => s + b, 0), 0
  );
  const totalRebuys = gamePlayers.reduce((sum, gp) => sum + gp.buyIns.length - 1, 0);
  const avgBuyIn = totalPot / gamePlayers.length;

  const winnerPlayer = players.find(p => p.id === winner?.playerId);
  const loserPlayer = players.find(p => p.id === loser?.playerId);

  return (
    <>
      {/* Back Button */}
      <BackButton />

      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Trophy weight="fill" className="text-poker-gold text-5xl animate-gold-pulse" />
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white drop-shadow-lg">Game Results</h1>
        </div>
        <p className="text-gray-400 text-lg">
          {formatDate(game.date)} at {formatTime(game.time)}
        </p>
      </div>

      {/* Winner/Loser Highlights */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Biggest Winner */}
        {winnerPlayer && winner && winner.profit > 0 && (
          <div className="glass-panel rounded-2xl p-8 border-2 border-poker-gold/50 bg-gradient-to-b from-poker-gold/20 to-transparent shadow-[0_0_40px_rgba(212,175,55,0.3)]">
            <div className="text-center">
              <Crown weight="fill" className="text-poker-gold text-7xl mx-auto mb-4 animate-gold-pulse" />
              <p className="text-poker-gold font-bold mb-3 uppercase tracking-wider text-sm">Biggest Winner</p>
              <div className="flex items-center justify-center gap-3 mb-4">
                <img
                  src={`/avatars/${winnerPlayer.avatar}`}
                  alt={formatPlayerName(winnerPlayer)}
                  className="w-16 h-16 rounded-full border-3 border-poker-gold shadow-xl"
                />
                <div className="text-left">
                  <h3 className="font-display text-2xl font-bold text-white">
                    {formatPlayerName(winnerPlayer)}
                  </h3>
                  <p className="text-gray-400 text-sm">The Champion</p>
                </div>
              </div>
              <p className="font-display text-5xl font-bold text-green-400 mb-2">
                +{formatCurrency(winner.profit)}
              </p>
              <p className="text-gray-400 text-sm">
                {((winner.profit / winner.buyIns.reduce((sum, b) => sum + b, 0)) * 100).toFixed(0)}% ROI
              </p>
            </div>
          </div>
        )}

        {/* Biggest Loser */}
        {loserPlayer && loser && loser.profit < 0 && (
          <div className="glass-panel rounded-2xl p-8 border-2 border-red-500/50 bg-gradient-to-b from-red-950/30 to-transparent">
            <div className="text-center">
              <div className="text-7xl mx-auto mb-4">💸</div>
              <p className="text-red-400 font-bold mb-3 uppercase tracking-wider text-sm">Biggest Loser</p>
              <div className="flex items-center justify-center gap-3 mb-4">
                <img
                  src={`/avatars/${loserPlayer.avatar}`}
                  alt={formatPlayerName(loserPlayer)}
                  className="w-16 h-16 rounded-full border-3 border-red-500 shadow-xl"
                />
                <div className="text-left">
                  <h3 className="font-display text-2xl font-bold text-white">
                    {formatPlayerName(loserPlayer)}
                  </h3>
                  <p className="text-gray-400 text-sm">Better luck next time!</p>
                </div>
              </div>
              <p className="font-display text-5xl font-bold text-red-400 mb-2">
                {formatCurrency(loser.profit)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="glass-panel rounded-2xl p-6 mb-8 border border-white/10">
        <h2 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <ChartBar weight="fill" className="text-poker-gold" />
          Final Standings
        </h2>
        <div className="space-y-3">
          {gamePlayers.map((gamePlayer, index) => {
            const player = players.find(p => p.id === gamePlayer.playerId);
            if (!player) return null;

            const totalBuyIn = gamePlayer.buyIns.reduce((sum, amount) => sum + amount, 0);
            const roi = (gamePlayer.profit / totalBuyIn) * 100;
            const medals = ['🥇', '🥈', '🥉'];
            const medal = medals[index];

            return (
              <div
                key={gamePlayer.id}
                className={`flex items-center gap-4 p-5 rounded-xl transition-all ${
                  index < 3
                    ? 'bg-gradient-to-r from-poker-gold/10 to-transparent border border-poker-gold/20'
                    : 'bg-white/5 border border-white/5'
                }`}
              >
                <div className="w-12 text-center flex-shrink-0">
                  {medal ? (
                    <span className="text-3xl">{medal}</span>
                  ) : (
                    <span className="text-gray-500 font-bold text-xl">{index + 1}</span>
                  )}
                </div>
                <img
                  src={`/avatars/${player.avatar}`}
                  alt={formatPlayerName(player)}
                  className={`w-14 h-14 rounded-full border-2 shadow-lg flex-shrink-0 ${
                    index === 0 ? 'border-poker-gold' : 'border-white/20'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-white text-lg truncate">
                    {formatPlayerName(player)}
                  </p>
                  <p className="text-gray-400 text-sm">
                    In: {formatCurrency(totalBuyIn)} • Out: {formatCurrency(gamePlayer.cashOut)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-display text-2xl font-bold ${gamePlayer.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {gamePlayer.profit >= 0 ? '+' : ''}{formatCurrency(gamePlayer.profit)}
                  </p>
                  <p className="text-gray-400 text-sm font-semibold">
                    {roi >= 0 ? '+' : ''}{roi.toFixed(0)}% ROI
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Game Statistics */}
      <div className="glass-panel rounded-2xl p-6 mb-8 border border-white/10">
        <h2 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <TrendUp weight="fill" className="text-poker-gold" />
          Game Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy weight="fill" className="text-poker-gold" size={20} />
              <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Total Pot</p>
            </div>
            <p className="font-display text-3xl font-bold text-poker-gold">
              {formatCurrency(totalPot)}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users weight="fill" className="text-blue-400" size={20} />
              <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Players</p>
            </div>
            <p className="font-display text-3xl font-bold text-white">{gamePlayers.length}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Fire weight="fill" className="text-orange-400" size={20} />
              <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Rebuys</p>
            </div>
            <p className="font-display text-3xl font-bold text-white">{totalRebuys}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ChartBar weight="fill" className="text-green-400" size={20} />
              <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Avg Buy-in</p>
            </div>
            <p className="font-display text-3xl font-bold text-white">{formatCurrency(avgBuyIn)}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={handleShareResults}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all"
        >
          <ShareNetwork weight="bold" size={20} />
          Share Results
        </button>
        <button
          onClick={() => router.push('/')}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold rounded-xl transition-all border border-yellow-200 shadow-lg"
        >
          <House weight="bold" size={20} />
          Back to Dashboard
        </button>
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="glass-panel rounded-2xl p-6 border border-white/10">
          <h3 className="font-display text-xl font-bold text-white mb-4">Admin Actions</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push(`/game/${game.id}/cashout`)}
              className="px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-400 font-bold rounded-lg transition-all"
            >
              Edit Cash-Out Results
            </button>
            <button
              onClick={() => router.push(`/game/${game.id}`)}
              className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-lg transition-all"
            >
              Back to Game Details
            </button>
          </div>
        </div>
      )}
    </>
  );
}
