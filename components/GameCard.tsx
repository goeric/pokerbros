'use client';

import React from 'react';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';
import { Game } from '@/types';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import { CalendarDots, Clock, CurrencyDollar, Users } from '@phosphor-icons/react';

interface GameCardProps {
  game: Game;
  confirmedCount: number;
  waitlistCount: number;
  compact?: boolean;
}

export default function GameCard({
  game,
  confirmedCount,
  waitlistCount,
  compact = false
}: GameCardProps) {
  // Check if game should be live (either explicitly in_progress or past scheduled time)
  const shouldBeLive = () => {
    if (game.status === 'in_progress') return true;
    if (game.status === 'completed') return false;

    const gameDateTime = new Date(`${game.date}T${game.time}`);
    const now = new Date();
    return gameDateTime <= now;
  };

  const isInProgress = shouldBeLive();
  const isUpcoming = game.status === 'upcoming' && !isInProgress;
  const isCompleted = game.status === 'completed';

  // Create arrays for the slot indicators
  const filledSlots = Array(Math.min(confirmedCount, 8)).fill(true);
  const emptySlots = Array(Math.max(0, 8 - confirmedCount)).fill(false);
  const allSlots = [...filledSlots, ...emptySlots];

  return (
    <a href={isInProgress ? `/game/${game.id}/live` : `/game/${game.id}`} className="block">
      <div className="glass-panel glass-card-hover p-6 rounded-2xl relative overflow-hidden group">
        {/* Subtle gradient overlay for live games */}
        {isInProgress && (
          <div className="absolute inset-0 bg-gradient-to-br from-poker-red/5 to-transparent pointer-events-none"></div>
        )}

        <div className="space-y-4 relative z-10">
          {/* Live Badge */}
          {isInProgress && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-poker-red/10 border border-poker-red/20 rounded-full">
              <div className="w-2 h-2 bg-poker-red rounded-full animate-pulse shadow-[0_0_8px_rgba(217,40,40,0.5)]"></div>
              <span className="text-poker-red text-xs font-display font-bold uppercase tracking-wide">LIVE NOW</span>
            </div>
          )}

          {/* Header: Date/Time and Buy-in */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              {/* Date */}
              <div className="flex items-center gap-2 text-white">
                <CalendarDots weight="bold" className="text-poker-gold" size={20} />
                <h4 className="text-lg font-display font-bold">
                  {formatDate(game.date)}
                </h4>
              </div>

              {/* Time */}
              <div className="flex items-center gap-2 text-gray-400">
                <Clock weight="bold" className="text-gray-500" size={20} />
                <span className="text-base">{formatTime(game.time)}</span>
              </div>
            </div>

            {/* Buy-in Badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-poker-gold/10 border border-poker-gold/20 rounded-full">
              <CurrencyDollar weight="bold" className="text-poker-gold" size={20} />
              <span className="font-display font-bold text-poker-gold">{formatCurrency(game.buyIn)}</span>
            </div>
          </div>

          {/* RSVP Indicators for Upcoming/In-Progress Games */}
          {!compact && (isUpcoming || isInProgress) && (
            <div className="space-y-3 pt-2">
              {/* Slot indicators */}
              <div className="flex items-center gap-1.5">
                {allSlots.map((filled, index) => (
                  <div
                    key={index}
                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                      filled
                        ? 'bg-poker-gold shadow-[0_0_8px_rgba(212,175,55,0.3)]'
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>

              {/* Confirmed and Waitlist counts */}
              <div className="flex items-center gap-2 text-sm">
                <Users weight="bold" className="text-poker-gold" size={16} />
                <span className="text-white font-display font-bold">
                  {confirmedCount}/8 Confirmed
                </span>
                {waitlistCount > 0 && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-400 font-medium">
                      {waitlistCount} waitlist
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Enter Live Game Button for In Progress */}
          {isInProgress && (
            <div className="pt-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = `/game/${game.id}/live`;
                }}
                className="w-full py-3 px-4 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold rounded-xl transition-all duration-200 hover:scale-[1.02] border border-yellow-200 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] flex items-center justify-center gap-2"
              >
                <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                <span className="tracking-wide">ENTER LIVE GAME</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
