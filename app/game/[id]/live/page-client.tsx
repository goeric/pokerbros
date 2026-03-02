'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Game, GamePlayer, Player } from '@/types';
import { formatCurrency, formatPlayerName, calculateTotalBuyIn, calculateTotalPot, calculateTotalRebuys } from '@/lib/utils';
import BackButton from '@/components/BackButton';
import { addRebuy, removeLastRebuy } from './actions';
import { CurrencyDollar, Users, Fire, Target, Plus, Minus, SignOut, Trophy } from '@phosphor-icons/react';

interface LiveGameClientProps {
  game: Game;
  initialGamePlayers: GamePlayer[];
  players: Player[];
  isAdmin: boolean;
}

export default function LiveGameClient({
  game,
  initialGamePlayers,
  players,
  isAdmin,
}: LiveGameClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [coinAnimation, setCoinAnimation] = useState<string | null>(null);

  const gamePlayers = initialGamePlayers;

  const handleAddRebuy = async (gamePlayerId: string) => {
    setCoinAnimation(gamePlayerId);
    setTimeout(() => setCoinAnimation(null), 600);

    startTransition(async () => {
      await addRebuy(game.id, gamePlayerId, game.buyIn);
    });
  };

  const handleRemoveRebuy = async (gamePlayerId: string) => {
    if (confirm('Remove the last rebuy for this player?')) {
      startTransition(async () => {
        const result = await removeLastRebuy(game.id, gamePlayerId);
        if ('error' in result) {
          alert(result.error);
        }
      });
    }
  };

  const handleEndGame = () => {
    if (confirm('End the game and proceed to cash-out recording?')) {
      router.push(`/game/${game.id}/cashout`);
    }
  };

  // Calculate total pot from game_players
  const totalPot = calculateTotalPot(gamePlayers);

  // Find player with most rebuys (only if they have rebuys, not just initial buy-in)
  const playersWithRebuys = gamePlayers.filter(gp => gp.buyIns.length > 1);
  const mostRebuys = playersWithRebuys.length > 0
    ? playersWithRebuys.reduce((max, gp) => gp.buyIns.length > max.buyIns.length ? gp : max, playersWithRebuys[0])
    : null;

  return (
    <>
      {/* Back Button */}
      <BackButton href={`/game/${game.id}`} label="Back to Game" />

      {/* Live Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.8)]"></span>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white drop-shadow-lg">Live Game</h1>
        </div>
        <p className="text-gray-400 text-lg">Track buy-ins and rebuys in real-time</p>
      </div>

      {/* Total Pot Display */}
      <div className="glass-panel rounded-2xl p-10 mb-8 text-center border-2 border-poker-gold/30 bg-gradient-to-b from-poker-gold/10 to-transparent shadow-[0_0_50px_rgba(212,175,55,0.2)]">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-4 font-bold">Total Pot</p>
        <div className="flex items-center justify-center gap-4">
          <CurrencyDollar weight="fill" className="text-poker-gold text-6xl animate-gold-pulse" />
          <p className="font-display text-7xl md:text-8xl font-bold text-poker-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]">
            {formatCurrency(totalPot)}
          </p>
        </div>
      </div>

      {/* Game Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-panel rounded-xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <Users weight="bold" className="text-blue-400" size={24} />
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Players</p>
          </div>
          <p className="text-3xl font-display font-bold text-white">{gamePlayers.length}</p>
        </div>
        <div className="glass-panel rounded-xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <Fire weight="fill" className="text-orange-400" size={24} />
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Rebuys</p>
          </div>
          <p className="text-3xl font-display font-bold text-white">
            {calculateTotalRebuys(gamePlayers)}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-6 border border-white/10 col-span-2 md:col-span-1">
          <div className="flex items-center gap-3 mb-2">
            <Trophy weight="fill" className="text-amber-400" size={24} />
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Most Rebuys</p>
          </div>
          {mostRebuys ? (
            <p className="text-xl font-display font-bold text-amber-400 truncate">
              {players.find(p => p.id === mostRebuys.playerId)?.first_name}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <Target weight="bold" className="text-green-400" size={20} />
              <p className="text-sm text-gray-400 italic">Playing tight!</p>
            </div>
          )}
        </div>
      </div>

      {/* Player Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {gamePlayers.map(gamePlayer => {
          const player = players.find(p => p.id === gamePlayer.playerId);
          if (!player) return null;

          const totalBuyIn = calculateTotalBuyIn(gamePlayer.buyIns);
          const rebuyCount = gamePlayer.buyIns.length - 1;

          return (
            <div key={gamePlayer.id} className="glass-panel rounded-2xl p-6 border border-white/10 relative overflow-hidden hover:border-poker-gold/30 transition-all group">
              {/* Coin Animation */}
              {coinAnimation === gamePlayer.id && (
                <div className="absolute top-4 right-4 animate-coin-drop z-10">
                  <CurrencyDollar weight="fill" className="w-12 h-12 text-poker-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.8)]" />
                </div>
              )}

              <div className="flex items-start gap-4 mb-6">
                <Image
                  src={`/avatars/${player.avatar}`}
                  alt={formatPlayerName(player)}
                  width={64}
                  height={64}
                  unoptimized
                  className="w-16 h-16 rounded-full border-2 border-poker-gold/50 shadow-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-xl font-bold text-white mb-1 truncate">
                    {formatPlayerName(player)}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-gray-400 text-sm font-medium">
                      {gamePlayer.buyIns.length} buy-in{gamePlayer.buyIns.length !== 1 ? 's' : ''}
                    </span>
                    {rebuyCount > 0 && (
                      <span className="px-2 py-0.5 bg-orange-950/50 border border-orange-500/50 text-orange-400 text-xs font-bold rounded">
                        {rebuyCount} rebuy{rebuyCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-display text-3xl font-bold text-poker-gold">
                    {formatCurrency(totalBuyIn)}
                  </p>
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleAddRebuy(gamePlayer.id)}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-bold rounded-lg transition-all border border-yellow-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus weight="bold" size={20} />
                    Add Rebuy +{formatCurrency(game.buyIn)}
                  </button>
                  {rebuyCount > 0 && (
                    <button
                      onClick={() => handleRemoveRebuy(gamePlayer.id)}
                      disabled={isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-bold rounded-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus weight="bold" size={16} />
                      Remove Last Rebuy
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* End Game Button - Admin Only */}
      {isAdmin && (
        <div className="glass-panel rounded-2xl p-8 border-2 border-poker-gold/30 bg-gradient-to-b from-poker-gold/10 to-transparent">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-poker-gold/20 border-2 border-poker-gold/50 flex items-center justify-center">
                <SignOut weight="bold" className="text-poker-gold" size={24} />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold text-white mb-1">Ready to cash out?</h3>
                <p className="text-gray-400 text-sm">
                  End the game and record everyone&apos;s final cash-out amounts
                </p>
              </div>
            </div>
            <button
              onClick={handleEndGame}
              className="px-8 py-4 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold rounded-xl transition-all border border-yellow-200 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] whitespace-nowrap"
            >
              End Game
            </button>
          </div>
        </div>
      )}
    </>
  );
}
