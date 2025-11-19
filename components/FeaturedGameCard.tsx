'use client';

import React from 'react';
import Link from 'next/link';
import { Game, Player } from '@/types';
import { formatDate, formatDateWithDay, formatTime, formatCurrency } from '@/lib/utils';
import { Coins } from '@phosphor-icons/react';

interface FeaturedGameCardProps {
  game: Game;
  confirmedCount: number;
  confirmedPlayers?: Player[];
}

export default function FeaturedGameCard({
  game,
  confirmedCount,
  confirmedPlayers = []
}: FeaturedGameCardProps) {
  // Get day of week from date
  const getDayOfWeek = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  return (
    <Link
      href={`/game/${game.id}`}
      className="glass-panel rounded-3xl p-1 relative overflow-hidden group border-poker-gold/10 hover:border-poker-gold/40 transition-all duration-500 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] block"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#020906] via-[#0f392b]/90 to-transparent z-0"></div>

      <div className="relative p-6 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 h-full z-10">
        {/* Left Side - Game Info */}
        <div className="space-y-6 w-full md:w-2/3">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-poker-gold/10 border border-poker-gold/30 text-poker-gold text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(212,175,55,0.1)]">
            <span className="w-2 h-2 rounded-full bg-poker-red animate-pulse shadow-[0_0_5px_#D92828]"></span>
            Confirmed Game
          </div>

          {/* Game Title */}
          <div>
            <h3 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 drop-shadow-lg">
              {getDayOfWeek(game.date)} Night
            </h3>
            <p className="text-gray-300 text-lg flex items-center gap-2">
              <Coins weight="bold" className="text-poker-gold" />
              No Limit Hold&apos;em
            </p>
          </div>

          {/* Game Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 pt-6">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-wider mb-1">Date</span>
              <span className="font-display text-lg md:text-xl text-white font-medium">
                {formatDateWithDay(game.date)}
              </span>
            </div>
            <div className="flex flex-col sm:border-l border-white/10 sm:pl-4">
              <span className="text-xs text-gray-400 uppercase tracking-wider mb-1">Shuffle Up</span>
              <span className="font-display text-lg md:text-xl text-poker-gold font-medium">
                {formatTime(game.time)}
              </span>
            </div>
            <div className="flex flex-col sm:border-l border-white/10 sm:pl-4">
              <span className="text-xs text-gray-400 uppercase tracking-wider mb-1">Buy-in</span>
              <span className="font-display text-lg md:text-xl text-white font-medium">
                {formatCurrency(game.buyIn)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side - RSVP Card */}
        <div className="bg-black/80 backdrop-blur-xl rounded-xl p-5 border border-white/5 min-w-full md:min-w-[200px] w-full md:w-auto shadow-[0_8px_32px_rgba(0,0,0,0.8)] mt-4 md:mt-0">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-300 font-medium">The Table</span>
            <span className="text-xs text-poker-gold font-bold">{confirmedCount}/8 Seats</span>
          </div>

          {/* Stacked Avatars - Show up to 4 avatars + overflow indicator */}
          <div className="flex -space-x-3 mb-5 pl-2">
            {/* Show first 4 avatars */}
            {confirmedPlayers.slice(0, 4).map((player, idx) => (
              <img
                key={player.id}
                className="w-10 h-10 rounded-full border-2 border-gray-900 bg-gray-800 shadow-lg relative"
                style={{ zIndex: 40 - idx * 10 }}
                src={`/avatars/${player.avatar}`}
                alt={`${player.first_name} ${player.last_name}`}
                title={`${player.first_name} ${player.last_name}`}
              />
            ))}

            {/* Show +X indicator if more than 4 players */}
            {confirmedCount > 4 && (
              <div
                className="w-10 h-10 rounded-full border-2 border-gray-900 bg-poker-gold/20 flex items-center justify-center text-xs font-bold text-poker-gold relative shadow-lg"
                style={{ zIndex: 0 }}
                title={`${confirmedCount - 4} more player${confirmedCount - 4 !== 1 ? 's' : ''}`}
              >
                +{confirmedCount - 4}
              </div>
            )}

            {/* Show empty seats only if less than 4 confirmed */}
            {confirmedCount < 4 && Array.from({ length: 4 - confirmedCount }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="w-10 h-10 rounded-full border-2 border-gray-900 border-dashed bg-white/5 flex items-center justify-center text-sm font-bold text-gray-500 relative shadow-lg"
                style={{ zIndex: 40 - (confirmedCount + idx) * 10 }}
                title="Open seat"
              >
                +
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="w-full py-3 rounded-lg bg-gradient-to-b from-gray-100 to-gray-300 text-black font-bold text-sm hover:from-white hover:to-gray-200 transition-all shadow-lg flex items-center justify-center gap-2 border border-white group-hover:scale-105">
            View Game
          </div>
        </div>
      </div>
    </Link>
  );
}
