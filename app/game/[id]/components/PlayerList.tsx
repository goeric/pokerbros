'use client';

import Image from 'next/image';
import { RSVP, Player } from '@/types';
import { formatPlayerName } from '@/lib/utils';
import { Check, ListBullets, Trophy } from '@phosphor-icons/react';

interface PlayerListProps {
  rsvps: RSVP[];
  players: Player[];
  type: 'confirmed' | 'waitlist';
  onCancel?: (playerId: string) => void;
  canCancel: (player: Player) => boolean;
  isPending: boolean;
}

export default function PlayerList({
  rsvps,
  players,
  type,
  onCancel,
  canCancel,
  isPending,
}: PlayerListProps) {
  if (rsvps.length === 0) return null;

  const isConfirmed = type === 'confirmed';

  return (
    <div className="glass-panel rounded-2xl p-6 mb-6 border border-white/10">
      <h3 className={`font-display text-xl font-bold mb-4 flex items-center gap-2 ${
        isConfirmed ? 'text-white' : 'text-amber-400'
      }`}>
        {isConfirmed ? (
          <Check weight="bold" className="text-green-400" size={24} />
        ) : (
          <ListBullets weight="bold" className="text-amber-500" size={24} />
        )}
        {isConfirmed ? 'Confirmed Players' : 'Waitlist'} ({rsvps.length})
      </h3>
      <div className="space-y-2">
        {rsvps.map((rsvp, index) => {
          const player = players.find(p => p.id === rsvp.playerId);
          if (!player) return null;

          return (
            <div
              key={rsvp.id}
              className={`flex items-center justify-between p-4 rounded-xl transition-all group ${
                isConfirmed
                  ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                  : 'bg-amber-950/30 hover:bg-amber-950/50 border border-amber-700/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isConfirmed
                    ? 'bg-poker-gold/20 border border-poker-gold/40'
                    : 'bg-amber-900/40 border border-amber-700/50'
                }`}>
                  <span className={`font-bold ${isConfirmed ? 'text-poker-gold text-lg' : 'text-amber-400'}`}>
                    {isConfirmed ? index + 1 : `#${rsvp.waitlistPosition}`}
                  </span>
                </div>
                <Image
                  src={`/avatars/${player.avatar}`}
                  alt={formatPlayerName(player)}
                  width={40}
                  height={40}
                  className={`w-10 h-10 rounded-full border-2 ${
                    isConfirmed ? 'border-gray-600' : 'border-amber-600'
                  }`}
                />
                <span className="text-white font-display font-bold">
                  {formatPlayerName(player)}
                </span>
              </div>
              {canCancel(player) && onCancel && (
                <button
                  onClick={() => onCancel(player.id)}
                  disabled={isPending}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
                >
                  {isConfirmed ? 'Cancel' : 'Remove'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {!isConfirmed && (
        <div className="mt-4 p-3 bg-amber-950/20 border border-amber-700/30 rounded-lg">
          <p className="text-amber-400/70 text-sm flex items-center gap-2">
            <Trophy weight="fill" className="text-amber-500" size={16} />
            Waitlisted players will be automatically promoted if someone cancels
          </p>
        </div>
      )}
    </div>
  );
}
