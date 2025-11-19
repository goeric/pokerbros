'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Location } from '@/types';
import { createLocation, updateLocation, deleteLocation } from './actions';
import { Users, MapPin, Gear, Plus, PencilSimple, Trash, X } from '@phosphor-icons/react';

interface LocationsClientProps {
  locations: Location[];
}

export default function LocationsClient({ locations }: LocationsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await createLocation(formData);

      if ('error' in result) {
        alert(result.error);
      } else {
        setFormData({ name: '', address: '' });
        setShowAddForm(false);
        router.refresh();
      }
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    startTransition(async () => {
      const result = await updateLocation(editingId, formData);

      if ('error' in result) {
        alert(result.error);
      } else {
        setFormData({ name: '', address: '' });
        setEditingId(null);
        router.refresh();
      }
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;

    startTransition(async () => {
      const result = await deleteLocation(id);

      if ('error' in result) {
        alert(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const startEdit = (location: Location) => {
    setEditingId(location.id);
    setFormData({ name: location.name, address: location.address });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', address: '' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Admin Navigation Tabs */}
      <div className="flex gap-3 mb-8">
        <Link
          href="/admin"
          className="flex items-center gap-2 px-4 py-3 glass-panel rounded-xl border border-white/10 hover:border-poker-gold/30 text-gray-300 hover:text-white font-medium transition-all"
        >
          <Users weight="bold" size={20} />
          Players
        </Link>
        <Link
          href="/admin/locations"
          className="flex items-center gap-2 px-4 py-3 glass-panel rounded-xl border-2 border-poker-gold/50 bg-gradient-to-b from-poker-gold/20 to-transparent text-white font-bold transition-all"
        >
          <MapPin weight="fill" className="text-poker-gold" size={20} />
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

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-white mb-2">Location Management</h1>
          <p className="text-gray-400">Manage poker game locations and addresses</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
            setFormData({ name: '', address: '' });
          }}
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold rounded-xl transition-all border border-yellow-200 shadow-lg hover:scale-105 disabled:opacity-50"
        >
          {showAddForm ? (
            <>
              <X weight="bold" size={20} />
              Cancel
            </>
          ) : (
            <>
              <Plus weight="bold" size={20} />
              Add Location
            </>
          )}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="glass-panel rounded-2xl p-6 mb-6 border border-white/10">
          <h2 className="font-display text-xl font-bold text-white mb-6">Add New Location</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Location Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Eric's House"
                required
                disabled={isPending}
                className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-poker-gold/20 focus:outline-none transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g., 123 Main St, San Francisco, CA 94102"
                required
                disabled={isPending}
                className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-poker-gold/20 focus:outline-none transition-all disabled:opacity-50"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-6 py-3 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold rounded-xl transition-all border border-yellow-200 shadow-lg disabled:opacity-50"
              >
                Add Location
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                disabled={isPending}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Locations List */}
      {locations.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 text-center border border-white/10">
          <MapPin weight="fill" className="text-poker-gold/50 mx-auto mb-4 animate-gold-pulse" size={64} />
          <p className="text-white font-display text-xl font-bold mb-2">No locations yet</p>
          <p className="text-gray-400 text-sm mb-6">Add your first location to get started</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold rounded-xl transition-all border border-yellow-200 shadow-lg"
          >
            <Plus weight="bold" size={20} />
            Add your first location
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {locations.map((location) => (
            <div key={location.id} className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all">
              {editingId === location.id ? (
                /* Edit Form */
                <form onSubmit={handleEdit} className="space-y-4">
                  <h3 className="font-display text-lg font-bold text-white mb-4">Edit Location</h3>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Location Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={isPending}
                      className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-poker-gold/20 focus:outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                      disabled={isPending}
                      className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-poker-gold/20 focus:outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex-1 px-6 py-3 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold rounded-xl transition-all border border-yellow-200 shadow-lg disabled:opacity-50"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={isPending}
                      className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* View Mode */
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin weight="fill" className="text-poker-gold" size={20} />
                      <h3 className="font-display text-lg font-bold text-white">
                        {location.name}
                      </h3>
                    </div>
                    <p className="text-gray-400 ml-7">
                      {location.address}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => startEdit(location)}
                      disabled={isPending}
                      className="p-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-400 rounded-lg transition-all disabled:opacity-50"
                      title="Edit location"
                    >
                      <PencilSimple weight="bold" size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(location.id, location.name)}
                      disabled={isPending}
                      className="p-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg transition-all disabled:opacity-50"
                      title="Delete location"
                    >
                      <Trash weight="bold" size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
