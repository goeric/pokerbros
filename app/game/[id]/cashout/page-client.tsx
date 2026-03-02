'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { Game, GamePlayer, Player } from '@/types';
import { formatCurrency, formatPlayerName, calculateTotalBuyIn } from '@/lib/utils';
import BackButton from '@/components/BackButton';
import { finalizeGameResults } from './actions';
import { CurrencyDollar, Minus, Plus, CheckCircle, XCircle, Trophy } from '@phosphor-icons/react';

interface CashOutClientProps {
  game: Game;
  gamePlayers: GamePlayer[];
  players: Player[];
}

export default function CashOutClient({
  game,
  gamePlayers,
  players,
}: CashOutClientProps) {
  const [isPending, startTransition] = useTransition();

  // Initialize cash-outs from existing data
  const initialCashOuts: Record<string, number> = {};
  const initialInputValues: Record<string, string> = {};
  gamePlayers.forEach(gp => {
    initialCashOuts[gp.playerId] = gp.cashOut || 0;
    initialInputValues[gp.playerId] = (gp.cashOut || 0).toFixed(2);
  });
  const [cashOuts, setCashOuts] = useState<Record<string, number>>(initialCashOuts);
  const [inputValues, setInputValues] = useState<Record<string, string>>(initialInputValues);

  const updateCashOut = (playerId: string, amount: number) => {
    const validAmount = Math.round(Math.max(0, amount) * 100) / 100;
    setCashOuts(prev => ({
      ...prev,
      [playerId]: validAmount,
    }));
    setInputValues(prev => ({
      ...prev,
      [playerId]: validAmount.toFixed(2),
    }));
  };

  const handleInputChange = (playerId: string, value: string) => {
    // Allow empty string or valid numbers
    setInputValues(prev => ({
      ...prev,
      [playerId]: value,
    }));

    // Update numeric value (treat empty as 0 for calculations)
    const numericValue = value === '' ? 0 : Number(value);
    if (!isNaN(numericValue)) {
      setCashOuts(prev => ({
        ...prev,
        [playerId]: Math.round(Math.max(0, numericValue) * 100) / 100,
      }));
    }
  };

  const handleInputBlur = (playerId: string) => {
    // On blur, normalize the display to two decimal places
    const currentValue = cashOuts[playerId] || 0;
    setInputValues(prev => ({
      ...prev,
      [playerId]: currentValue.toFixed(2),
    }));
  };

  const handleQuickSet = (playerId: string, type: 'busted' | 'even') => {
    const gamePlayer = gamePlayers.find(gp => gp.playerId === playerId);
    if (!gamePlayer) return;

    const totalBuyIn = calculateTotalBuyIn(gamePlayer.buyIns);

    if (type === 'busted') {
      updateCashOut(playerId, 0);
    } else if (type === 'even') {
      updateCashOut(playerId, totalBuyIn);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Finalize results? This will end the game.')) {
      return;
    }

    startTransition(async () => {
      const result = await finalizeGameResults(game.id, cashOuts);
      if (result && 'error' in result) {
        alert(result.error);
      }
    });
  };

  // Calculate validation
  const totalIn = gamePlayers.reduce((sum, gp) => sum + calculateTotalBuyIn(gp.buyIns), 0);
  const totalOut = Object.values(cashOuts).reduce((sum, amount) => sum + amount, 0);
  const difference = totalOut - totalIn;
  const validation = {
    valid: Math.abs(difference) < 0.01,
    totalIn,
    totalOut,
    difference,
  };

  return (
    <>
      {/* Back Button */}
      <BackButton href={`/game/${game.id}/live`} label="Back to Live Game" />

      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Trophy weight="fill" className="text-poker-gold text-5xl" />
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white drop-shadow-lg">Cash-Out</h1>
        </div>
        <p className="text-gray-400 text-lg">Record final cash-out amounts for each player</p>
      </div>

      {/* Total Pot Reminder */}
      <div className="glass-panel rounded-2xl p-10 mb-8 text-center border-2 border-poker-gold/30 bg-gradient-to-b from-poker-gold/10 to-transparent shadow-[0_0_50px_rgba(212,175,55,0.2)]">
        <p className="text-gray-400 text-sm uppercase tracking-widest mb-4 font-bold">Total Pot to Distribute</p>
        <div className="flex items-center justify-center gap-4">
          <CurrencyDollar weight="fill" className="text-poker-gold text-6xl animate-gold-pulse" />
          <p className="font-display text-7xl md:text-8xl font-bold text-poker-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]">
            {formatCurrency(totalIn)}
          </p>
        </div>
      </div>

      {/* Player List */}
      <div className="space-y-4 mb-8">
        {gamePlayers.map(gamePlayer => {
          const player = players.find(p => p.id === gamePlayer.playerId);
          if (!player) return null;

          const totalBuyIn = calculateTotalBuyIn(gamePlayer.buyIns);
          const cashOut = cashOuts[gamePlayer.playerId] || 0;
          const profit = cashOut - totalBuyIn;

          return (
            <div key={gamePlayer.id} className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-poker-gold/30 transition-all">
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
                  <p className="text-gray-400 text-sm">
                    Total in: <span className="text-white font-semibold">{formatCurrency(totalBuyIn)}</span>
                  </p>
                </div>
                <div className={`text-right flex-shrink-0 ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  <p className="text-3xl font-display font-bold">
                    {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                  </p>
                  <p className="text-xs uppercase tracking-wider font-semibold">
                    {profit >= 0 ? 'profit' : 'loss'}
                  </p>
                </div>
              </div>

              {/* Quick Set Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => handleQuickSet(gamePlayer.playerId, 'busted')}
                  disabled={isPending}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-bold rounded-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Busted ($0)
                </button>
                <button
                  onClick={() => handleQuickSet(gamePlayer.playerId, 'even')}
                  disabled={isPending}
                  className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-400 font-bold rounded-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Even ({formatCurrency(totalBuyIn)})
                </button>
              </div>

              {/* Cash Out Input */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateCashOut(gamePlayer.playerId, cashOut - 1)}
                  disabled={isPending}
                  className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus weight="bold" size={20} />
                </button>
                <div className="flex-1 relative">
                  <CurrencyDollar weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 text-poker-gold text-xl" />
                  <input
                    type="number"
                    value={inputValues[gamePlayer.playerId] ?? ''}
                    onChange={(e) => handleInputChange(gamePlayer.playerId, e.target.value)}
                    onBlur={() => handleInputBlur(gamePlayer.playerId)}
                    min="0"
                    step="0.01"
                    disabled={isPending}
                    className="w-full pl-12 pr-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-lg text-white text-center font-display font-bold text-2xl focus:ring-2 focus:ring-poker-gold/20 focus:outline-none disabled:opacity-50 transition-all"
                  />
                </div>
                <button
                  onClick={() => updateCashOut(gamePlayer.playerId, cashOut + 1)}
                  disabled={isPending}
                  className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus weight="bold" size={20} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation Section */}
      <div className={`glass-panel rounded-2xl p-8 mb-6 border-2 ${validation.valid ? 'border-green-500/50 bg-gradient-to-b from-green-950/30 to-transparent' : 'border-red-500/50 bg-gradient-to-b from-red-950/30 to-transparent'}`}>
        <div className="flex items-center gap-3 mb-6">
          {validation.valid ? (
            <CheckCircle weight="fill" className="text-green-400 text-3xl" />
          ) : (
            <XCircle weight="fill" className="text-red-400 text-3xl" />
          )}
          <h3 className="font-display text-2xl font-bold text-white">Validation</h3>
        </div>

        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-semibold">Total In</p>
            <p className="font-display text-3xl font-bold text-white">
              {formatCurrency(validation.totalIn)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-semibold">Total Out</p>
            <p className="font-display text-3xl font-bold text-white">
              {formatCurrency(validation.totalOut)}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-2 uppercase tracking-wider font-semibold">Difference</p>
            <p className={`font-display text-3xl font-bold ${validation.valid ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(Math.abs(validation.difference))}
            </p>
          </div>
        </div>

        {!validation.valid && (
          <div className="mt-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
            <p className="text-red-400 font-bold text-center flex items-center justify-center gap-2">
              <XCircle weight="fill" size={20} />
              Totals must match before finalizing!
            </p>
          </div>
        )}
      </div>

      {/* Finalize Button */}
      <button
        onClick={handleFinalize}
        disabled={!validation.valid || isPending}
        className="w-full px-8 py-5 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold text-xl rounded-xl transition-all border border-yellow-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-poker-gold disabled:hover:to-yellow-600"
      >
        {isPending ? 'Finalizing...' : 'Finalize Results'}
      </button>
    </>
  );
}
