'use client';

import { User } from '@supabase/supabase-js';
import { Game, RSVP, Player } from '@/types';
import { formatPlayerName } from '@/lib/utils';
import { MAX_SEATS } from '@/lib/constants';
import { Users, Check, X } from '@phosphor-icons/react';
import PlayerList from './PlayerList';

interface RSVPSectionProps {
  game: Game;
  rsvps: RSVP[];
  players: Player[];
  user: User | null;
  isAdmin: boolean;
  isPending: boolean;
  gameShouldBeLive: boolean;
  selectedPlayerId: string;
  onSelectPlayer: (playerId: string) => void;
  onRSVP: () => void;
  onSelfRSVP: () => void;
  onCancelRSVP: (playerId: string) => void;
}

export default function RSVPSection({
  game,
  rsvps,
  players,
  user,
  isAdmin,
  isPending,
  gameShouldBeLive,
  selectedPlayerId,
  onSelectPlayer,
  onRSVP,
  onSelfRSVP,
  onCancelRSVP,
}: RSVPSectionProps) {
  const confirmedRSVPs = rsvps.filter(r => r.status === 'confirmed');
  const waitlistRSVPs = rsvps.filter(r => r.status === 'waitlist').sort((a, b) =>
    (a.waitlistPosition || 0) - (b.waitlistPosition || 0)
  );
  const availablePlayers = players.filter(p => !rsvps.find(r => r.playerId === p.id));

  // Find the player that matches the current user's email
  const currentPlayer = user?.email ? players.find(p => p.email === user.email) : null;
  const hasRSVPd = currentPlayer ? rsvps.find(r => r.playerId === currentPlayer.id) : null;
  const canSelfRSVP = user && currentPlayer && !hasRSVPd;

  const canCancelPlayer = (player: Player): boolean => {
    return isAdmin || !!(user && player.email === user.email);
  };

  // Don't show RSVP section for completed games or non-admins on live games
  if (game.status === 'completed') return null;
  if (gameShouldBeLive && !isAdmin) return null;
  if (!gameShouldBeLive && game.status !== 'upcoming') return null;

  return (
    <>
      {/* Warning banner for admins editing live games */}
      {gameShouldBeLive && isAdmin && (
        <div className="mb-6 glass-panel border-2 border-amber-500 bg-amber-950/50 rounded-xl p-4">
          <p className="text-amber-400 font-bold flex items-center gap-2">
            <X weight="bold" size={24} className="text-amber-500" />
            Managing RSVPs for a live game - changes take effect immediately
          </p>
        </div>
      )}

      <div className="glass-panel rounded-2xl p-6 mb-6 border border-white/10">
        <h2 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Users weight="bold" className="text-poker-gold" size={28} />
          RSVP {gameShouldBeLive && isAdmin && <span className="text-sm text-amber-400 ml-2">(Admin Only)</span>}
        </h2>

        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-gray-400 font-medium">
              {confirmedRSVPs.length}/{MAX_SEATS} Seats Filled
            </span>
            {waitlistRSVPs.length > 0 && (
              <span className="text-amber-400 font-medium">
                {waitlistRSVPs.length} on waitlist
              </span>
            )}
          </div>
          {/* Seat Indicator */}
          <div className="flex gap-2">
            {[...Array(MAX_SEATS)].map((_, i) => (
              <div
                key={i}
                className={`h-3 flex-1 rounded-full transition-all ${
                  i < confirmedRSVPs.length
                    ? 'bg-poker-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Admin can RSVP any player */}
        {isAdmin && (
          <div className="flex gap-3">
            <select
              value={selectedPlayerId}
              onChange={(e) => onSelectPlayer(e.target.value)}
              className="flex-1 px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-poker-gold focus:border-poker-gold transition-all"
              disabled={isPending}
            >
              <option value="">Select player to RSVP...</option>
              {availablePlayers.map(player => (
                <option key={player.id} value={player.id}>
                  {formatPlayerName(player)}
                </option>
              ))}
            </select>
            <button
              onClick={onRSVP}
              disabled={!selectedPlayerId || isPending}
              className="px-6 py-3 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-bold rounded-lg transition-all border border-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              RSVP Player
            </button>
          </div>
        )}

        {/* Non-admin players can RSVP themselves (only on upcoming games) */}
        {!isAdmin && !gameShouldBeLive && user && canSelfRSVP && currentPlayer && (
          <button
            onClick={onSelfRSVP}
            disabled={isPending}
            className="w-full px-6 py-4 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-bold rounded-lg transition-all border border-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            RSVP for Myself
          </button>
        )}

        {/* Show message if player already RSVP'd (only on upcoming games) */}
        {!isAdmin && !gameShouldBeLive && user && hasRSVPd && (
          <div className="p-4 bg-green-950/50 border-2 border-green-500 rounded-xl">
            <p className="text-green-400 text-center font-bold flex items-center justify-center gap-2">
              <Check weight="bold" size={20} />
              You&apos;re {hasRSVPd.status === 'confirmed' ? 'confirmed' : `#${hasRSVPd.waitlistPosition} on the waitlist`}
            </p>
          </div>
        )}

        {/* Show login prompt for non-authenticated users (only on upcoming games) */}
        {!isAdmin && !gameShouldBeLive && !user && (
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-gray-300 text-center text-sm">
              <a href="/login" className="text-poker-gold hover:underline font-bold">Sign in</a> to RSVP for this game
            </p>
          </div>
        )}
      </div>

      {/* Confirmed Players */}
      <PlayerList
        rsvps={confirmedRSVPs}
        players={players}
        type="confirmed"
        onCancel={onCancelRSVP}
        canCancel={canCancelPlayer}
        isPending={isPending}
      />

      {/* Waitlist */}
      <PlayerList
        rsvps={waitlistRSVPs}
        players={players}
        type="waitlist"
        onCancel={onCancelRSVP}
        canCancel={canCancelPlayer}
        isPending={isPending}
      />
    </>
  );
}
