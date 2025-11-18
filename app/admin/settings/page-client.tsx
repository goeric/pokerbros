'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { updateSetting } from './actions';
import type { User } from '@supabase/supabase-js';

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

export default function SettingsClient({ settings, user, isAdmin }: SettingsClientProps) {
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
    <>
      <div className="mb-6">
        <BackButton href="/admin" label="Back to Admin" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Configure feature flags and app settings
        </p>

        <div className="space-y-4">
          {settings.map((setting) => {
            const isBoolean = typeof setting.value === 'boolean' ||
                             setting.value === 'true' ||
                             setting.value === 'false';

            if (!isBoolean) {
              // Non-boolean settings (like app_version) - display only
              return (
                <div
                  key={setting.key}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {setting.key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {setting.description}
                    </p>
                  </div>
                  <div className="ml-4 text-gray-600 dark:text-gray-400 font-mono text-sm">
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
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {setting.key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {setting.description}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(setting.key, boolValue)}
                  disabled={isPending || isToggling}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-poker-green focus:ring-offset-2 ${
                    boolValue
                      ? 'bg-poker-green'
                      : 'bg-gray-200 dark:bg-gray-700'
                  } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      boolValue ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Warning banner */}
        {settings.some(s => s.key === 'email_superadmin_only' && getBooleanValue(s.value) === false) && (
          <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-yellow-600 dark:text-yellow-500 text-xl mr-3">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-500">
                  Email Safety Mode Disabled
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  All players will receive emails. Make sure this is intentional in production.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
