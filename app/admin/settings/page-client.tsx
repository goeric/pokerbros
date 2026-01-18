'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateSetting } from './actions';
import type { User } from '@supabase/supabase-js';
import { Users, MapPin, Gear, Warning } from '@phosphor-icons/react';

interface Setting {
  key: string;
  value: string | boolean;
  description: string;
}

interface SettingsClientProps {
  settings: Setting[];
  user: User | null;
  isAdmin: boolean;
}

export default function SettingsClient({ settings, user: _user, isAdmin: _isAdmin }: SettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const handleToggle = async (key: string, currentValue: boolean) => {
    setTogglingKey(key);
    startTransition(async () => {
      const result = await updateSetting(key, !currentValue);
      if ('error' in result) {
        alert(result.error || 'Failed to update setting');
      }
      setTogglingKey(null);
      router.refresh();
    });
  };

  const getBooleanValue = (value: string | boolean): boolean => {
    if (typeof value === 'boolean') return value;
    return value === 'true';
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
          className="flex items-center gap-2 px-4 py-3 glass-panel rounded-xl border border-white/10 hover:border-poker-gold/30 text-gray-300 hover:text-white font-medium transition-all"
        >
          <MapPin weight="bold" size={20} />
          Locations
        </Link>
        <Link
          href="/admin/settings"
          className="flex items-center gap-2 px-4 py-3 glass-panel rounded-xl border-2 border-poker-gold/50 bg-gradient-to-b from-poker-gold/20 to-transparent text-white font-bold transition-all"
        >
          <Gear weight="fill" className="text-poker-gold" size={20} />
          Settings
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-white mb-2">App Settings</h1>
        <p className="text-gray-400">Configure feature flags and app settings</p>
      </div>

      {/* Settings List */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
        <div className="space-y-0">
          {settings.map((setting, index) => {
            const isBoolean = typeof setting.value === 'boolean' ||
                             setting.value === 'true' ||
                             setting.value === 'false';

            if (!isBoolean) {
              // Non-boolean settings (like app_version) - display only
              return (
                <div
                  key={setting.key}
                  className={`flex items-center justify-between p-6 ${
                    index !== settings.length - 1 ? 'border-b border-white/10' : ''
                  }`}
                >
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-white">
                      {setting.key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {setting.description}
                    </p>
                  </div>
                  <div className="ml-4 px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-gray-300 font-mono text-sm">
                    {typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value)}
                  </div>
                </div>
              );
            }

            // Boolean settings - toggle
            const boolValue = getBooleanValue(setting.value);
            const isToggling = togglingKey === setting.key;

            return (
              <div
                key={setting.key}
                className={`flex items-center justify-between p-6 ${
                  index !== settings.length - 1 ? 'border-b border-white/10' : ''
                }`}
              >
                <div className="flex-1">
                  <h3 className="font-display font-bold text-white">
                    {setting.key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {setting.description}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(setting.key, boolValue)}
                  disabled={isPending || isToggling}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-poker-gold/50 focus:ring-offset-2 focus:ring-offset-black/40 ${
                    boolValue
                      ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-lg shadow-green-500/30'
                      : 'bg-gray-700 border border-white/10'
                  } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                  title={boolValue ? 'Click to disable' : 'Click to enable'}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                      boolValue ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Warning banner */}
      {settings.some(s => s.key === 'email_superadmin_only' && getBooleanValue(s.value) === false) && (
        <div className="mt-6 glass-panel rounded-2xl p-6 border-2 border-yellow-500/50 bg-gradient-to-b from-yellow-500/20 to-transparent">
          <div className="flex items-start gap-4">
            <Warning weight="fill" className="text-yellow-500 flex-shrink-0" size={32} />
            <div>
              <h3 className="font-display font-bold text-yellow-500 text-lg">
                Email Safety Mode Disabled
              </h3>
              <p className="text-gray-300 mt-1">
                All players will receive emails. Make sure this is intentional in production.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
