import React from 'react';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';
import { Game } from '@/types';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';

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

  // In progress games get special beige styling
  const cardBgClass = isInProgress
    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    : '';

  // Create arrays for the slot indicators
  const filledSlots = Array(Math.min(confirmedCount, 8)).fill(true);
  const emptySlots = Array(Math.max(0, 8 - confirmedCount)).fill(false);
  const allSlots = [...filledSlots, ...emptySlots];

  return (
    <a href={isInProgress ? `/game/${game.id}/live` : `/game/${game.id}`} className="block">
      <Card hover={true} className={`p-6 ${cardBgClass}`}>
        <div className="space-y-4">
          {/* Header: Date/Time and Buy-in Badge */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              {isInProgress && (
                <Badge variant="danger" className="uppercase text-xs font-bold mb-2">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>
                  IN PROGRESS
                </Badge>
              )}

              {/* Date with icon */}
              <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h4 className="text-lg font-semibold">
                  {formatDate(game.date)}
                </h4>
              </div>

              {/* Time with icon */}
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-base">{formatTime(game.time)}</span>
              </div>
            </div>

            {/* Buy-in Badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-bold text-green-700 dark:text-green-300">{formatCurrency(game.buyIn)}</span>
            </div>
          </div>

          {/* RSVP Indicators for Upcoming/In-Progress Games */}
          {!compact && (isUpcoming || isInProgress) && (
            <div className="space-y-3 pt-2">
              {/* Slot indicators - rounded rectangles */}
              <div className="flex items-center gap-1.5">
                {allSlots.map((filled, index) => (
                  <div
                    key={index}
                    className={`flex-1 h-2 rounded-full transition-colors ${
                      filled
                        ? 'bg-green-500 dark:bg-green-400'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              {/* Confirmed and Waitlist counts */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-900 dark:text-white font-semibold">
                  {confirmedCount}/8 Confirmed
                </span>
                {waitlistCount > 0 && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-amber-700 dark:text-amber-400 font-semibold">
                      {waitlistCount} on waitlist
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Enter Live Game Button for In Progress */}
          {isInProgress && (
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = `/game/${game.id}/live`;
                }}
              >
                <span className="inline-block w-2 h-2 bg-white rounded-full mr-2"></span>
                Enter Live Game
              </Button>
            </div>
          )}
        </div>
      </Card>
    </a>
  );
}
