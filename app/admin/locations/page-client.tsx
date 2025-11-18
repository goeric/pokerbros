'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Location } from '@/types';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import BackButton from '@/components/BackButton';
import { createLocation, updateLocation, deleteLocation } from './actions';

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton href="/admin" label="Back to Admin" />

      {/* Admin Navigation */}
      <div className="mb-6 flex gap-3">
        <Link
          href="/admin"
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Players
        </Link>
        <Link
          href="/admin/locations"
          className="px-4 py-2 bg-poker-green text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
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

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Locations</h1>
        <Button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
            setFormData({ name: '', address: '' });
          }}
          variant="primary"
          disabled={isPending}
        >
          {showAddForm ? 'Cancel' : 'Add Location'}
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add New Location</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              label="Location Name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Eric's House"
              required
            />
            <Input
              label="Address"
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g., 123 Main St, San Francisco, CA 94102"
              required
            />
            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={isPending} fullWidth>
                Add Location
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAddForm(false)}
                disabled={isPending}
                fullWidth
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Locations List */}
      <div className="space-y-4">
        {locations.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-4xl mb-4">📍</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No locations yet</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Add your first location to get started
            </p>
          </Card>
        ) : (
          locations.map((location) => (
            <Card key={location.id} className="p-6">
              {editingId === location.id ? (
                /* Edit Form */
                <form onSubmit={handleEdit} className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Location</h3>
                  <Input
                    label="Location Name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                  <div className="flex gap-3">
                    <Button type="submit" variant="primary" disabled={isPending} fullWidth>
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={cancelEdit}
                      disabled={isPending}
                      fullWidth
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                /* View Mode */
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {location.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {location.address}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => startEdit(location)}
                      disabled={isPending}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(location.id, location.name)}
                      disabled={isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
