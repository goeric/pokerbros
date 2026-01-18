'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Player } from '@/types';
import { UserRole } from '@/lib/auth-server';
import PlayerModal from './PlayerModal';
import { deletePlayer } from '../actions';
import { Users, MapPin, Gear, Plus, PencilSimple, Trash, TrendUp, TrendDown } from '@phosphor-icons/react';

interface AdminClientProps {
  initialPlayers: Player[];
  canEdit: boolean;
  userRole: UserRole | null;
}

export default function AdminClient({ initialPlayers, canEdit, userRole: _userRole }: AdminClientProps) {
  const _router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isPending, startTransition] = useTransition();

  // Clean up OAuth redirect timestamp from URL
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('t')) {
      url.searchParams.delete('t');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleOpenModal = (player?: Player) => {
    setEditingPlayer(player || null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPlayer(null);
  };

  const handleDelete = (playerId: string) => {
    if (!confirm('Are you sure you want to delete this player? This action cannot be undone.')) {
      return;
    }

    startTransition(async () => {
      const result = await deletePlayer(playerId);
      if ('error' in result) {
        alert(`Error deleting player: ${result.error}`);
      }
    });
  };

  return (
    <>
      {/* Admin Navigation Tabs */}
      {canEdit && (
        <div className="flex gap-3 mb-8">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-4 py-3 glass-panel rounded-xl border-2 border-poker-gold/50 bg-gradient-to-b from-poker-gold/20 to-transparent text-white font-bold transition-all"
          >
            <Users weight="fill" className="text-poker-gold" size={20} />
            Players
          </Link>
          <Link
            href="/admin/locations"
            className="flex items-center gap-2 px-4 py-3 glass-panel rounded-xl border border-white/10 hover:border-poker-gold/30 text-gray-300 hover:text-white font-medium transition-all"
          >
            <MapPin weight="bold" size={20} />
            Locations
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-2 px-4 py-3 glass-panel rounded-xl border border-white/10 hover:border-poker-gold/30 text-gray-300 hover:text-white font-medium transition-all"
          >
            <Gear weight="bold" size={20} />
            Settings
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-white mb-2">Player Management</h1>
          <p className="text-gray-400">
            {canEdit ? 'Add and manage poker players' : 'View poker players (read-only)'}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold rounded-xl transition-all border border-yellow-200 shadow-lg hover:scale-105"
          >
            <Plus weight="bold" size={20} />
            Add Player
          </button>
        )}
      </div>

      {/* Players List */}
      {initialPlayers.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 text-center border border-white/10">
          <Users weight="fill" className="text-poker-gold/50 text-6xl mx-auto mb-4 animate-gold-pulse" />
          <p className="text-white font-display text-xl font-bold mb-2">No players yet</p>
          <p className="text-gray-400 text-sm mb-6">Add your first player to get started</p>
          {canEdit && (
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold rounded-xl transition-all border border-yellow-200 shadow-lg"
            >
              <Plus weight="bold" size={20} />
              Add your first player
            </button>
          )}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Avatar</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Name</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Nickname</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Email</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Games</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Total P/L</th>
                  <th className="text-right py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialPlayers.map((player) => {
                  const profit = player.totalOut - player.totalIn;
                  return (
                    <tr key={player.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6">
                        <Image
                          src={`/avatars/${player.avatar}`}
                          alt={`${player.first_name} ${player.last_name}`}
                          width={40}
                          height={40}
                          unoptimized
                          className="w-10 h-10 rounded-full border-2 border-poker-gold/50 shadow-lg"
                        />
                      </td>
                      <td className="py-4 px-6 font-display font-bold text-white">
                        {player.first_name} {player.last_name}
                      </td>
                      <td className="py-4 px-6 text-gray-300">
                        {player.nickname ? `"${player.nickname}"` : '-'}
                      </td>
                      <td className="py-4 px-6 text-gray-400">{player.email}</td>
                      <td className="py-4 px-6 text-gray-300 font-semibold">{player.gamesPlayed}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1">
                          {profit >= 0 ? (
                            <TrendUp weight="bold" className="text-green-400" size={16} />
                          ) : (
                            <TrendDown weight="bold" className="text-red-400" size={16} />
                          )}
                          <span className={`font-display font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {profit >= 0 ? '+' : ''}${Math.abs(profit).toFixed(0)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {canEdit ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal(player)}
                              disabled={isPending}
                              className="p-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-400 rounded-lg transition-all disabled:opacity-50"
                              title="Edit player"
                            >
                              <PencilSimple weight="bold" size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(player.id)}
                              disabled={isPending}
                              className="p-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg transition-all disabled:opacity-50"
                              title="Delete player"
                            >
                              <Trash weight="bold" size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-600">-</span>
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

      <PlayerModal
        isOpen={showModal}
        onClose={handleCloseModal}
        player={editingPlayer}
      />
    </>
  );
}
