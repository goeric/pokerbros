'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Player } from '@/types';
import { UserRole } from '@/lib/auth-server';
import Button from '@/components/Button';
import PlayerModal from './PlayerModal';
import { deletePlayer } from '../actions';

interface AdminClientProps {
  initialPlayers: Player[];
  canEdit: boolean;
  userRole: UserRole | null;
}

export default function AdminClient({ initialPlayers, canEdit, userRole }: AdminClientProps) {
  const router = useRouter();
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
      {/* Admin Navigation */}
      {canEdit && (
        <div className="mb-6 flex gap-3">
          <Link
            href="/admin"
            className="px-4 py-2 bg-poker-green text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Players
          </Link>
          <Link
            href="/admin/locations"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Locations
          </Link>
          <Link
            href="/admin/settings"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Settings
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Player Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {canEdit ? 'Add and manage poker players' : 'View poker players (read-only)'}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => handleOpenModal()}>
            + Add Player
          </Button>
        )}
      </div>

      {initialPlayers.length === 0 ? (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No players yet</p>
          {canEdit && <Button onClick={() => handleOpenModal()}>Add your first player</Button>}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-400 font-medium">Name</th>
                  <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-400 font-medium">Nickname</th>
                  <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-400 font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-400 font-medium">Games Played</th>
                  <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-400 font-medium">Total P/L</th>
                  <th className="text-right py-3 px-4 text-gray-700 dark:text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialPlayers.map((player) => {
                  const profit = player.totalOut - player.totalIn;
                  return (
                    <tr key={player.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                        {player.first_name} {player.last_name}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {player.nickname || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{player.email}</td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{player.gamesPlayed}</td>
                      <td className="py-3 px-4">
                        <span className={profit >= 0 ? 'text-green-600 dark:text-green-500 font-semibold' : 'text-red-600 dark:text-red-500 font-semibold'}>
                          ${Math.abs(profit).toFixed(0)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canEdit ? (
                          <>
                            <button
                              onClick={() => handleOpenModal(player)}
                              disabled={isPending}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mr-4 disabled:opacity-50 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(player.id)}
                              disabled={isPending}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 font-medium"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">-</span>
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
